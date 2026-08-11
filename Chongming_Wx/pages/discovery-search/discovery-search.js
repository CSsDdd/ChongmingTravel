const checkpointRepository = require('../../repositories/checkpoint-repository')

Page({
  data: {
    query: {
      text: '',
    },
    checkpoints: [],
  },

  onLoad() {
    this.search(this.data.query)
  },

  handleInput(e) {
    this.updateQuery({ text: e.detail.value })
  },

  updateQuery(changes) {
    const query = {
      ...this.data.query,
      ...changes,
    }
    this.setData({ query })
    this.search(query)
  },

  async search(query) {
    const checkpoints = await checkpointRepository.searchPublished(query)
    this.setData({ checkpoints })
  },

  openCheckpoint(e) {
    const { id, version } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/checkpoint-detail/checkpoint-detail?checkpointId=${id}&version=${version}`,
    })
  },
})
