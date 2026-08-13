const checkpointRepository = require('../../repositories/checkpoint-repository')
const { withImageUrl } = require('../../utils/local-media')

Page({
  data: {
    checkpoint: null,
    loading: true,
    missing: false,
  },

  async onLoad(options) {
    const checkpointId = options.checkpointId || ''
    const version = Number(options.version)
    const checkpoint = await checkpointRepository.findVersion(
      checkpointId,
      version
    )

    this.setData({
      checkpoint: checkpoint ? withImageUrl(checkpoint) : null,
      loading: false,
      missing: checkpoint === null,
    })
  },

  onImageError() {
    this.setData({ 'checkpoint.imageUrl': '' })
  },

  addToRoute() {
    wx.showToast({ title: '已加入路线', icon: 'success' })
  },

  createSchedule() {
    wx.showToast({ title: '安排功能待实现', icon: 'none' })
  },
})
