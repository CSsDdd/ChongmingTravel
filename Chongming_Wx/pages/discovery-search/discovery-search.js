const checkpointRepository = require('../../repositories/checkpoint-repository')
const { withImageUrl } = require('../../utils/local-media')

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
    const checkpoints = (await checkpointRepository.searchPublished(query)).map(
      withImageUrl
    )
    this.setData({ checkpoints })
  },

  onCheckpointImageError(e) {
    const index = Number(e.currentTarget.dataset.index)
    this.setData({ [`checkpoints[${index}].imageUrl`]: '' })
  },

  openCheckpoint(e) {
    const { id, version } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/checkpoint-detail/checkpoint-detail?checkpointId=${id}&version=${version}`,
    })
  },
})
