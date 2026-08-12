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

  selectCheckpoint(e) {
    const { id, version, title } = e.currentTarget.dataset
    const eventChannel = this.getOpenerEventChannel()

    eventChannel.emit('checkpointSelected', {
      id,
      version,
      title,
    })
    wx.navigateBack()
  },
})
