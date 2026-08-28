const checkpointRepository = require('../../repositories/checkpoint-repository')
const routeRepository = require('../../repositories/route-repository')
const sampleBanners = require('../../data/sample-banners')
const { resolveImageUrl, withImageUrl } = require('../../utils/local-media')

function shuffle(items) {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const targetIndex = Math.floor(Math.random() * (index + 1))
    const current = result[index]
    result[index] = result[targetIndex]
    result[targetIndex] = current
  }
  return result
}

function createCheckpointFeedItem(checkpoint) {
  return {
    key: `CHECKPOINT:${checkpoint.checkpointId}:${checkpoint.version}`,
    type: 'CHECKPOINT',
    data: withImageUrl(checkpoint),
  }
}

function createRouteFeedItem(route) {
  const traffic = [...new Set(route.stops
    .map(stop => stop.trafficToNext)
    .filter(Boolean))]
  return {
    key: `ROUTE:${route.routeId}:${route.version}`,
    type: 'ROUTE',
    data: {
      ...route,
      imageUrl: resolveImageUrl(route.coverImageId),
      tagText: route.tagIds.join(' · '),
      trafficText: traffic.join(' · '),
    },
  }
}

Page({
  data: {
    banners: sampleBanners,
    feedItems: [],
  },

  async onLoad() {
    const [checkpoints, routes] = await Promise.all([
      checkpointRepository.getPublishedCheckpointDTOs(),
      routeRepository.getPublishedRouteDTOs(),
    ])
    const feedItems = shuffle([
      ...checkpoints.map(createCheckpointFeedItem),
      ...routes.map(createRouteFeedItem),
    ])
    this.setData({ feedItems })
  },

  onFeedImageError(e) {
    const index = Number(e.currentTarget.dataset.index)
    this.setData({ [`feedItems[${index}].data.imageUrl`]: '' })
  },

  openCheckpointSearch() {
    wx.navigateTo({
      url: '/pages/discovery/search/discovery-search',
    })
  },

  openCheckpoint(e) {
    const { id, version } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/checkpoint/detail/checkpoint-detail?checkpointId=${id}&version=${version}`,
    })
  },

  openRoute(e) {
    const { id, version } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/route/detail/detail?routeId=${encodeURIComponent(id)}&version=${version}`,
    })
  },
})
