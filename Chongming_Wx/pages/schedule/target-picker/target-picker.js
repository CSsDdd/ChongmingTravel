const {
  searchAvailableTargets,
} = require('../../../repositories/schedule-target-repository')
const { ScheduleTargetType } = require('../../../models/schedule')
const { resolveImageUrl } = require('../../../utils/local-media')

const TARGET_TYPE_OPTIONS = [
  { label: '全部', value: 'ALL' },
  { label: '打卡点', value: ScheduleTargetType.CHECKPOINT },
  { label: '路线', value: ScheduleTargetType.PERSONAL_ROUTE },
]

Page({
  data: {
    query: {
      text: '',
      targetType: 'ALL',
    },
    typeOptions: TARGET_TYPE_OPTIONS,
    targets: [],
    isLoading: true,
  },

  onLoad() {
    this.search(this.data.query)
  },

  handleInput(event) {
    this.updateQuery({ text: event.detail.value })
  },

  selectTargetType(event) {
    this.updateQuery({ targetType: event.currentTarget.dataset.type })
  },

  updateQuery(changes) {
    const query = { ...this.data.query, ...changes }
    this.setData({ query })
    this.search(query)
  },

  async search(query) {
    const sequence = (this.searchSequence || 0) + 1
    this.searchSequence = sequence
    this.setData({ isLoading: true })
    try {
      const results = await searchAvailableTargets(query)
      if (sequence !== this.searchSequence) return
      this.setData({
        targets: results.map(target => ({
          ...target,
          imageUrl: resolveImageUrl(target.imageId),
        })),
        isLoading: false,
      })
    } catch (error) {
      if (sequence !== this.searchSequence) return
      this.setData({ targets: [], isLoading: false })
      wx.showToast({ title: error.message || '安排目标加载失败', icon: 'none' })
    }
  },

  onTargetImageError(event) {
    const index = Number(event.currentTarget.dataset.index)
    if (Number.isInteger(index)) {
      this.setData({ [`targets[${index}].imageUrl`]: '' })
    }
  },

  selectTarget(event) {
    const target = this.data.targets[Number(event.currentTarget.dataset.index)]
    if (!target) {
      wx.showToast({ title: '没有找到该安排目标', icon: 'none' })
      return
    }
    this.getOpenerEventChannel().emit('scheduleTargetSelected', {
      targetRef: target.targetRef,
      title: target.title,
      source: target.source,
      sourceLabel: target.sourceLabel,
      typeLabel: target.typeLabel,
    })
    wx.navigateBack()
  },
})
