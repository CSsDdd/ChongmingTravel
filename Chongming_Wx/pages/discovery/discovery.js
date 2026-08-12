const checkpointRepository = require('../../repositories/checkpoint-repository')
const sampleBanners = require('../../data/sample-banners')

Page({
  data: {
    banners: sampleBanners,
    checkpoints: [],
  },

  async onLoad() {
    const checkpoints = await checkpointRepository.findPublished()
    this.setData({ checkpoints })
  },

  openCheckpointSearch() {
    wx.navigateTo({
      url: '/pages/discovery-search/discovery-search',
    })
  },

  openCheckpoint(e) {
    const { id, version } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/checkpoint-detail/checkpoint-detail?checkpointId=${id}&version=${version}`,
    })
  },
})
