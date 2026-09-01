const {
  FavoriteTargetType,
  searchCurrentUserFavorites,
} = require('../../queries/favorite-content-query')
const { resolveImageUrl } = require('../../utils/local-media')

const TYPE_OPTIONS = [
  { label: '全部', value: FavoriteTargetType.ALL },
  { label: '打卡点', value: FavoriteTargetType.CHECKPOINT },
  { label: '路线', value: FavoriteTargetType.ROUTE },
]

function createEmptyText(query, isLoggedIn) {
  if (!isLoggedIn) return '登录后就能查看收藏啦'
  if (query.text || query.targetType !== FavoriteTargetType.ALL) {
    return '没有找到符合条件的收藏'
  }
  return '暂时还没有收藏'
}

Page({
  data: {
    query: {
      text: '',
      targetType: FavoriteTargetType.ALL,
    },
    typeOptions: TYPE_OPTIONS,
    favorites: [],
    emptyText: '',
    isLoading: true,
  },

  onShow() {
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
      const result = await searchCurrentUserFavorites(query)
      if (sequence !== this.searchSequence) return
      this.setData({
        favorites: result.items.map(item => ({
          ...item,
          imageUrl: resolveImageUrl(item.imageId),
        })),
        emptyText: createEmptyText(query, result.isLoggedIn),
        isLoading: false,
      })
    } catch (error) {
      if (sequence !== this.searchSequence) return
      this.setData({
        favorites: [],
        emptyText: '收藏加载失败，请稍后再试',
        isLoading: false,
      })
      wx.showToast({ title: error.message || '收藏加载失败', icon: 'none' })
    }
  },

  onFavoriteImageError(event) {
    const index = Number(event.currentTarget.dataset.index)
    if (Number.isInteger(index)) {
      this.setData({ [`favorites[${index}].imageUrl`]: '' })
    }
  },

  openFavorite(event) {
    const favorite = this.data.favorites[
      Number(event.currentTarget.dataset.index)
    ]
    if (!favorite) return
    if (favorite.type === FavoriteTargetType.CHECKPOINT) {
      wx.navigateTo({
        url: `/pages/checkpoint/detail/checkpoint-detail?checkpointId=${encodeURIComponent(favorite.id)}&version=${favorite.version}`,
      })
      return
    }
    wx.navigateTo({
      url: `/pages/route/detail/detail?routeId=${encodeURIComponent(favorite.id)}&version=${favorite.version}`,
    })
  },
})
