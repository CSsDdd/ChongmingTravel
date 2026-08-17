const checkpointRepository = require('../../repositories/checkpoint-repository')
const sampleBanners = require('../../data/sample-banners')
const { withImageUrl } = require('../../utils/local-media')

Page({
  data: {
    banners: sampleBanners,
    checkpoints: [],
  },

  async onLoad() {
    const checkpoints = (await checkpointRepository.findPublished()).map(
      withImageUrl
    )
    this.setData({ checkpoints })
  },

  onCheckpointImageError(e) {
    const index = Number(e.currentTarget.dataset.index)
    this.setData({ [`checkpoints[${index}].imageUrl`]: '' })
  },

  openCheckpointSearch() {
    wx.navigateTo({
      url: '/pages/discovery/search/discovery-search',
    })
  },

  openCheckpoint(e) {
    const { id, version } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/checkpoint/detail/checkpoint-detail?checkpointId=${id}&version=${version}`,
    })
  },
})
