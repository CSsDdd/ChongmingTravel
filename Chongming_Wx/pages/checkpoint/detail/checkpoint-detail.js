const checkpointRepository = require('../../../repositories/checkpoint-repository')
const interactionRepository = require('../../../repositories/content-interaction-repository')
const userRepository = require('../../../repositories/user-repository')
const {
  InteractionActionType,
  InteractionTargetType,
} = require('../../../models/content-interaction')
const { withImageUrl } = require('../../../utils/local-media')

Page({
  data: {
    checkpoint: null,
    currentUserId: '',
    isLiked: false,
    isFavorited: false,
    isInteractionBusy: false,
    showShareDialog: false,
    loading: true,
    missing: false,
  },

  async onLoad(options) {
    const checkpointId = options.checkpointId
      ? decodeURIComponent(options.checkpointId)
      : ''
    const version = Number(options.version)
    if (!checkpointId || !Number.isInteger(version) || version <= 0) {
      this.setData({ loading: false, missing: true })
      return
    }
    this.shareCheckpointParams = { checkpointId, version }
    await this.loadCheckpoint(checkpointId, version)
  },

  async loadCheckpoint(checkpointId, version) {
    try {
      const checkpoint = await checkpointRepository.getPublishedCheckpointDTO(
        checkpointId,
        version
      )
      if (!checkpoint) {
        this.setData({ loading: false, missing: true })
        return
      }

      const viewCount = await checkpointRepository.incrementViewCount(checkpointId)
      await interactionRepository.importLegacyLikes(
        InteractionTargetType.CHECKPOINT,
        checkpointId,
        checkpoint.likedUserIds
      )
      const currentUser = await userRepository.findCurrent()
      const summary = await interactionRepository.findTargetSummary(
        InteractionTargetType.CHECKPOINT,
        checkpointId,
        currentUser ? currentUser.id : ''
      )
      this.interactionCountOffsets = {
        likeCount: Math.max(0, checkpoint.likeCount - summary.likeCount),
        favoriteCount: Math.max(
          0,
          checkpoint.favoriteCount - summary.favoriteCount
        ),
      }
      this.setData({
        checkpoint: withImageUrl({
          ...checkpoint,
          likeCount: this.interactionCountOffsets.likeCount + summary.likeCount,
          favoriteCount: this.interactionCountOffsets.favoriteCount
            + summary.favoriteCount,
          viewCount,
        }),
        currentUserId: currentUser ? currentUser.id : '',
        isLiked: summary.isLiked,
        isFavorited: summary.isFavorited,
        loading: false,
      })
    } catch (error) {
      this.setData({ loading: false, missing: true })
      wx.showToast({ title: error.message || '打卡点加载失败', icon: 'none' })
    }
  },

  onImageError() {
    this.setData({ 'checkpoint.imageUrl': '' })
  },

  async toggleInteraction(event) {
    if (this.data.isInteractionBusy) return
    if (!this.data.currentUserId) {
      wx.showToast({ title: '登录后才能进行互动', icon: 'none' })
      return
    }
    const actionType = event.currentTarget.dataset.action
    if (!Object.values(InteractionActionType).includes(actionType)) return
    this.setData({ isInteractionBusy: true })
    try {
      const result = await interactionRepository.toggleForCurrentUser(
        InteractionTargetType.CHECKPOINT,
        this.data.checkpoint.checkpointId,
        actionType
      )
      const offsets = this.interactionCountOffsets || {
        likeCount: 0,
        favoriteCount: 0,
      }
      this.setData({
        isLiked: result.isLiked,
        isFavorited: result.isFavorited,
        'checkpoint.likeCount': offsets.likeCount + result.likeCount,
        'checkpoint.favoriteCount': offsets.favoriteCount + result.favoriteCount,
      })
    } catch (error) {
      wx.showToast({ title: error.message || '互动操作失败', icon: 'none' })
    } finally {
      this.setData({ isInteractionBusy: false })
    }
  },

  openShareDialog() {
    this.setData({ showShareDialog: true })
  },

  closeShareDialog() {
    this.setData({ showShareDialog: false })
  },

  preventShareDialogClose() {},

  async recordShareAttempt(checkpointId) {
    try {
      const shareCount = await checkpointRepository.incrementShareCount(
        checkpointId
      )
      this.setData({ 'checkpoint.shareCount': shareCount })
    } catch (error) {
      wx.showToast({ title: error.message || '转发次数记录失败', icon: 'none' })
    }
  },

  // 微信原生分享必须同步返回配置，统计写入在后台独立完成
  onShareAppMessage() {
    const checkpoint = this.data.checkpoint
    const params = this.shareCheckpointParams
    if (!checkpoint || !params) return {}

    const shareData = {
      title: checkpoint.title || '打卡点详情',
      path: `/pages/checkpoint/detail/checkpoint-detail?checkpointId=${encodeURIComponent(params.checkpointId)}&version=${params.version}`,
    }
    if (checkpoint.imageUrl) {
      shareData.imageUrl = checkpoint.imageUrl
    }
    // 此处统计用户发起转发，不代表消息已经成功送达
    this.recordShareAttempt(params.checkpointId)
    this.setData({ showShareDialog: false })
    return shareData
  },

  addToRoute() {
    wx.showToast({ title: '已加入路线', icon: 'success' })
  },

  createSchedule() {
    wx.showToast({ title: '安排功能待实现', icon: 'none' })
  },
})
