const checkpointRepository = require('../../repositories/checkpoint-repository')
const {
  CheckpointDraftReviewStatus,
} = require('../../models/checkpoint')

function createDraftView(draft) {
  const isInReview = draft.reviewStatus === CheckpointDraftReviewStatus.IN_REVIEW
  return {
    ...draft,
    reviewStatusLabel: isInReview ? '审核中' : '未提交审核',
    reviewStatusClass: isInReview ? 'status-in-review' : 'status-not-submitted',
  }
}

Page({
  data: {
    activeDraftType: 'checkpoint',
    drafts: [],
    isLoading: true,
  },

  async onShow() {
    await this.loadDrafts()
  },

  async loadDrafts() {
    this.setData({ isLoading: true })
    try {
      const drafts = (await checkpointRepository.findDrafts()).map(
        createDraftView
      )
      this.setData({ drafts, isLoading: false })
    } catch (error) {
      this.setData({ isLoading: false })
      wx.showToast({ title: error.message || '草稿加载失败', icon: 'none' })
    }
  },

  selectDraftType(e) {
    const draftType = e.currentTarget.dataset.type
    if (draftType !== 'checkpoint' && draftType !== 'route') {
      return
    }
    this.setData({ activeDraftType: draftType })
  },

  createCheckpoint() {
    wx.navigateTo({ url: '/pages/checkpoint/editor/checkpoint-editor' })
  },

  editCheckpoint(e) {
    const checkpointId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/checkpoint/editor/checkpoint-editor?checkpointId=${encodeURIComponent(checkpointId)}`,
    })
  },
})
