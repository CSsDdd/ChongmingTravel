const checkpointRepository = require('../../repositories/checkpoint-repository')

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
      checkpoint,
      loading: false,
      missing: checkpoint === null,
    })
  },

  addToRoute() {
    wx.showToast({ title: '已加入路线', icon: 'success' })
  },

  createSchedule() {
    wx.showToast({ title: '安排功能待实现', icon: 'none' })
  },
})
