const checkpointRepository = require('../../../repositories/checkpoint-repository')
const { withImageUrl } = require('../../../utils/local-media')

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

  selectCheckpoint(e) {
    const index = Number(e.currentTarget.dataset.index)
    const checkpoint = this.data.checkpoints[index]
    if (!checkpoint) {
      wx.showToast({ title: '没有找到该打卡点', icon: 'none' })
      return
    }
    const eventChannel = this.getOpenerEventChannel()

    eventChannel.emit('checkpointSelected', {
      id: checkpoint.checkpointId,
      version: checkpoint.version,
    })
    wx.navigateBack()
  },
})
