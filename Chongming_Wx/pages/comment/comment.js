const commentRepository = require('../../repositories/comment-repository')
const commentReportRepository = require('../../repositories/comment-report-repository')
const { CommentStatus, CommentTargetType } = require('../../models/comment')
const { CommentReportReason } = require('../../models/comment-report')
const { findRootCommentItems } = require('../../queries/comment-list-query')
const { resolveCommentTarget } = require('../../queries/comment-target-query')
const { resolveImageUrl } = require('../../utils/local-media')
const userRepository = require('../../repositories/user-repository')

const TARGET_TYPE_LABELS = {
  [CommentTargetType.CHECKPOINT]: '打卡点',
  [CommentTargetType.ROUTE]: '路线'
}

const REPORT_REASON_OPTIONS = [
  { value: CommentReportReason.SPAM, label: '垃圾广告' },
  { value: CommentReportReason.ABUSE, label: '辱骂或攻击' },
  { value: CommentReportReason.INAPPROPRIATE, label: '不当内容' },
  { value: CommentReportReason.MISINFORMATION, label: '虚假或误导信息' },
  { value: CommentReportReason.OTHER, label: '其他' }
]

function findDisplayedComment(comments, commentId) {
  for (const root of comments) {
    if (root.id === commentId) return root
    const reply = (root.replies || []).find(item => item.id === commentId)
    if (reply) return reply
  }
  return null
}

function isActionSheetCancellation(error) {
  return Boolean(error?.errMsg && error.errMsg.includes('cancel'))
}

function updateCommentItem(comments, commentId, changes) {
  return comments.map(root => {
    if (root.id === commentId) return { ...root, ...changes }
    return {
      ...root,
      replies: (root.replies || []).map(reply => (
        reply.id === commentId ? { ...reply, ...changes } : reply
      ))
    }
  })
}

Page({
  data: {
    targetType: '',
    targetId: '',
    target: null,
    comments: [],
    commentContent: '',
    replyToCommentId: '',
    replyingToName: '',
    composerOpen: false,
    inputFocused: false,
    canSubmitComment: false,
    isSubmittingComment: false,
    reportReasonOptions: REPORT_REASON_OPTIONS,
    reportPanelOpen: false,
    reportingCommentId: '',
    selectedReportReason: '',
    reportDetail: '',
    canSubmitReport: false,
    isSubmittingReport: false,
    loadingTarget: true,
    loadingComments: true,
    invalidTarget: false
  },

  async onLoad(options) {
    const targetType = options.targetType
      ? decodeURIComponent(options.targetType)
      : ''
    const targetId = options.targetId
      ? decodeURIComponent(options.targetId)
      : ''
    const targetTypeLabel = TARGET_TYPE_LABELS[targetType] || ''

    if (!targetTypeLabel || !targetId) {
      this.setData({ loadingTarget: false, invalidTarget: true })
      wx.showToast({ title: '评论对象信息不完整', icon: 'none' })
      return
    }

    const targetRef = { type: targetType, id: targetId }
    this.setData({ targetType, targetId })
    await this.loadTarget(targetRef)

    if (!this.data.invalidTarget) {
      await this.loadComments(targetRef)
    }
    this.initialCommentsLoaded = true
  },

  onShow() {
    if (
      !this.initialCommentsLoaded ||
      !this.data.targetType ||
      !this.data.targetId ||
      this.data.invalidTarget
    ) return

    this.loadComments({
      type: this.data.targetType,
      id: this.data.targetId
    })
  },

  async loadTarget(targetRef) {
    try {
      const target = await resolveCommentTarget(targetRef)
      if (!target) {
        this.setData({ loadingTarget: false, invalidTarget: true })
        wx.showToast({ title: '没有找到对应的公开内容', icon: 'none' })
        return
      }

      this.setData({
        target: {
          ...target,
          imageUrl: resolveImageUrl(target.imageId)
        },
        loadingTarget: false
      })
    } catch (error) {
      this.setData({ loadingTarget: false, invalidTarget: true })
      wx.showToast({ title: error.message || '评论对象加载失败', icon: 'none' })
    }
  },

  // 首次进入、重新显示或发布后查询，保持评论列表与 Storage 一致。
  async loadComments(targetRef) {
    this.setData({ loadingComments: true })
    try {
      const comments = await findRootCommentItems(targetRef)
      this.setData({ comments, loadingComments: false })
    } catch (error) {
      this.setData({ comments: [], loadingComments: false })
      wx.showToast({ title: error.message || '评论加载失败', icon: 'none' })
    }
  },

  async openCommentComposer() {
    await this.openComposerWithContext()
  },

  async openReplyComposer(event) {
    const replyToCommentId = event.detail.commentId
    const targetComment = findDisplayedComment(
      this.data.comments,
      replyToCommentId
    )
    if (!targetComment) {
      wx.showToast({ title: '没有找到要回复的评论', icon: 'none' })
      return
    }

    await this.openComposerWithContext({
      replyToCommentId,
      replyingToName: targetComment.authorName
    })
  },

  async openCommentActions(event) {
    const commentId = event.detail.commentId
    const comment = findDisplayedComment(this.data.comments, commentId)
    const actionType = comment?.canDelete
      ? 'WITHDRAW'
      : (comment?.canReport ? 'REPORT' : '')
    if (!actionType || this.isWithdrawingComment) return

    try {
      const action = await wx.showActionSheet({
        itemList: [actionType === 'WITHDRAW' ? '撤回评论' : '举报评论'],
        itemColor: actionType === 'WITHDRAW' ? '#c44f4f' : '#2f6f4e'
      })
      if (action.tapIndex !== 0) return

      if (actionType === 'REPORT') {
        await this.openReportPanel(commentId)
        return
      }

      const result = await wx.showModal({
        title: '撤回评论',
        content: '撤回后将显示占位信息，已有回复不会被删除。',
        confirmText: '撤回',
        confirmColor: '#c44f4f'
      })
      if (!result.confirm) return

      await this.withdrawComment(commentId)
    } catch (error) {
      if (isActionSheetCancellation(error)) return
      wx.showToast({ title: error.message || '暂时无法撤回评论', icon: 'none' })
    }
  },

  async toggleCommentLike(event) {
    const commentId = event.detail.commentId
    const comment = findDisplayedComment(this.data.comments, commentId)
    if (!comment || comment.isUnavailable) return

    if (!this.likingCommentIds) this.likingCommentIds = new Set()
    if (this.likingCommentIds.has(commentId)) return
    this.likingCommentIds.add(commentId)

    try {
      const currentUser = await userRepository.findCurrent()
      if (!currentUser) {
        await this.promptLogin()
        return
      }

      const summary = await commentRepository.toggleLikeForCurrentUser(commentId)
      this.setData({
        comments: updateCommentItem(this.data.comments, commentId, {
          isLiked: summary.active,
          likeCount: summary.likeCount
        })
      })
    } catch (error) {
      wx.showToast({ title: error.message || '点赞失败', icon: 'none' })
    } finally {
      this.likingCommentIds.delete(commentId)
    }
  },

  async withdrawComment(commentId) {
    this.isWithdrawingComment = true
    try {
      await commentRepository.softDeleteForCurrentUser(commentId)
      if (this.data.replyToCommentId === commentId) {
        this.resetCommentComposer()
      }
      await this.loadComments({
        type: this.data.targetType,
        id: this.data.targetId
      })
      wx.showToast({ title: '评论已撤回', icon: 'success' })
    } finally {
      this.isWithdrawingComment = false
    }
  },

  async openReportPanel(commentId) {
    const currentUser = await userRepository.findCurrent()
    if (!currentUser) {
      await this.promptLogin()
      return
    }

    this.setData({
      reportPanelOpen: true,
      reportingCommentId: commentId,
      selectedReportReason: '',
      reportDetail: '',
      canSubmitReport: false,
      inputFocused: false
    })
  },

  selectReportReason(event) {
    const selectedReportReason = event.currentTarget.dataset.reason
    this.setData({
      selectedReportReason,
      canSubmitReport: selectedReportReason !== CommentReportReason.OTHER ||
        this.data.reportDetail.trim().length > 0
    })
  },

  handleReportDetailInput(event) {
    const reportDetail = event.detail.value
    this.setData({
      reportDetail,
      canSubmitReport: Boolean(this.data.selectedReportReason) && (
        this.data.selectedReportReason !== CommentReportReason.OTHER ||
        reportDetail.trim().length > 0
      )
    })
  },

  closeReportPanel() {
    if (this.data.isSubmittingReport) return
    this.resetReportPanel()
  },

  stopPropagation() {},

  async submitCommentReport() {
    if (!this.data.canSubmitReport || this.data.isSubmittingReport) return
    this.setData({ isSubmittingReport: true })

    try {
      await commentReportRepository.createForCurrentUser(
        this.data.reportingCommentId,
        {
          reason: this.data.selectedReportReason,
          detail: this.data.reportDetail
        }
      )
      this.resetReportPanel()
      await this.loadComments({
        type: this.data.targetType,
        id: this.data.targetId
      })
      wx.showToast({ title: '举报已处理', icon: 'success' })
    } catch (error) {
      this.setData({ isSubmittingReport: false })
      wx.showToast({ title: error.message || '举报提交失败', icon: 'none' })
    }
  },

  resetReportPanel() {
    this.setData({
      reportPanelOpen: false,
      reportingCommentId: '',
      selectedReportReason: '',
      reportDetail: '',
      canSubmitReport: false,
      isSubmittingReport: false
    })
  },

  async openComposerWithContext(replyContext = {}) {
    if (this.data.invalidTarget || this.data.loadingTarget) return
    if (this.isOpeningComposer) return

    this.isOpeningComposer = true
    try {
      const currentUser = await userRepository.findCurrent()
      if (!currentUser) {
        await this.promptLogin()
        return
      }

      this.setData({
        composerOpen: true,
        replyToCommentId: replyContext.replyToCommentId || '',
        replyingToName: replyContext.replyingToName || ''
      }, () => {
        this.setData({ inputFocused: true })
      })
    } catch (error) {
      wx.showToast({ title: error.message || '暂时无法发表评论', icon: 'none' })
    } finally {
      this.isOpeningComposer = false
    }
  },

  handleCommentInput(event) {
    const commentContent = event.detail.value
    this.setData({
      commentContent,
      canSubmitComment: commentContent.trim().length > 0
    })
  },

  handleCommentBlur() {
    this.setData({ inputFocused: false })
  },

  cancelComment() {
    if (this.data.isSubmittingComment) return
    this.resetCommentComposer()
  },

  // 发布仍交给 Repository；页面只负责输入状态和发布后的列表刷新。
  async submitComment() {
    if (!this.data.canSubmitComment || this.data.isSubmittingComment) return

    const targetRef = {
      type: this.data.targetType,
      id: this.data.targetId
    }
    this.setData({ isSubmittingComment: true })

    try {
      const content = this.data.commentContent.trim()
      const isReply = Boolean(this.data.replyToCommentId)
      const comment = isReply
        ? await commentRepository.createReply(this.data.replyToCommentId, content)
        : await commentRepository.createRoot(targetRef, content)
      const contentType = isReply ? '回复' : '评论'
      const title = comment.status === CommentStatus.VISIBLE
        ? `${contentType}已发布`
        : `${contentType}已提交审核`

      this.resetCommentComposer()
      await this.loadComments(targetRef)
      wx.showToast({ title, icon: 'success' })
    } catch (error) {
      this.setData({ isSubmittingComment: false })
      wx.showToast({ title: error.message || '评论发布失败', icon: 'none' })
    }
  },

  resetCommentComposer() {
    this.setData({
      commentContent: '',
      replyToCommentId: '',
      replyingToName: '',
      composerOpen: false,
      inputFocused: false,
      canSubmitComment: false,
      isSubmittingComment: false
    })
  },

  async promptLogin() {
    const result = await wx.showModal({
      title: '请先登录',
      content: '登录后就可以发表评论啦',
      confirmText: '去登录',
      cancelText: '暂不'
    })

    if (result.confirm) {
      await wx.navigateTo({ url: '/pages/user/login/login' })
    }
  }
})
