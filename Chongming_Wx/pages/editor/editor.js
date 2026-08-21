const checkpointRepository = require('../../repositories/checkpoint-repository')
const routeRepository = require('../../repositories/route-repository')
const {
  CheckpointDraftReviewStatus,
} = require('../../models/checkpoint')
const {
  RouteDraftReviewStatus,
} = require('../../models/route')

function createDraftView(draft, inReviewStatus) {
  const isInReview = draft.reviewStatus === inReviewStatus
  return {
    ...draft,
    reviewStatusLabel: isInReview ? '审核中' : '未提交审核',
    reviewStatusClass: isInReview ? 'status-in-review' : 'status-not-submitted',
  }
}

function createCheckpointDraftView(draft) {
  return createDraftView(draft, CheckpointDraftReviewStatus.IN_REVIEW)
}

function createRouteDraftView(draft) {
  return {
    ...createDraftView(draft, RouteDraftReviewStatus.IN_REVIEW),
    checkpointCount: draft.stops.length,
    tagText: draft.tagIds.join(' · '),
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

  async loadDrafts(draftType = this.data.activeDraftType) {
    this.setData({ isLoading: true })
    try {
      const isRoute = draftType === 'route'
      const repository = isRoute ? routeRepository : checkpointRepository
      const createView = isRoute
        ? createRouteDraftView
        : createCheckpointDraftView
      const drafts = (await repository.findDrafts()).map(createView)
      if (this.data.activeDraftType !== draftType) {
        return
      }
      this.setData({ drafts, isLoading: false })
    } catch (error) {
      if (this.data.activeDraftType !== draftType) {
        return
      }
      this.setData({ isLoading: false })
      wx.showToast({ title: error.message || '草稿加载失败', icon: 'none' })
    }
  },

  selectDraftType(e) {
    const draftType = e.currentTarget.dataset.type
    if (draftType !== 'checkpoint' && draftType !== 'route') {
      return
    }
    if (draftType === this.data.activeDraftType) {
      return
    }
    this.setData({ activeDraftType: draftType, drafts: [] }, () => {
      this.loadDrafts(draftType)
    })
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

  createRoute() {
    wx.navigateTo({ url: '/pages/route/editor/editor' })
  },

  editRoute(e) {
    const routeId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/route/editor/editor?routeId=${encodeURIComponent(routeId)}`,
    })
  },

  copyPublishedRoute() {
    wx.showToast({ title: '路线选择页待接入', icon: 'none' })
  },
})
