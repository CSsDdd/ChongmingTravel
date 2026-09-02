const routeRepository = require('../../../repositories/route-repository')
const { resolveImageUrl } = require('../../../utils/local-media')

Page({
  data: {
    query: {
      text: '',
    },
    routes: [],
    isLoading: true,
  },

  onLoad() {
    this.search(this.data.query)
  },

  handleInput(event) {
    const query = { ...this.data.query, text: event.detail.value }
    this.setData({ query })
    this.search(query)
  },

  async search(query) {
    const sequence = (this.searchSequence || 0) + 1
    this.searchSequence = sequence
    this.setData({ isLoading: true })
    try {
      const routes = await routeRepository.searchPublishedRouteDTOs(query)
      if (sequence !== this.searchSequence) return
      this.setData({
        routes: routes.map(route => ({
          ...route,
          imageUrl: resolveImageUrl(route.coverImageId),
          tagText: route.tagIds.join(' · '),
        })),
        isLoading: false,
      })
    } catch (error) {
      if (sequence !== this.searchSequence) return
      this.setData({ routes: [], isLoading: false })
      wx.showToast({ title: error.message || '路线加载失败', icon: 'none' })
    }
  },

  onRouteImageError(event) {
    const index = Number(event.currentTarget.dataset.index)
    if (Number.isInteger(index)) {
      this.setData({ [`routes[${index}].imageUrl`]: '' })
    }
  },

  selectRoute(event) {
    const route = this.data.routes[Number(event.currentTarget.dataset.index)]
    if (!route) {
      wx.showToast({ title: '没有找到该路线', icon: 'none' })
      return
    }
    this.getOpenerEventChannel().emit('routeSelected', {
      routeId: route.routeId,
      version: route.version,
    })
    wx.navigateBack()
  },
})
