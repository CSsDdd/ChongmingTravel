const checkpointRepository = require('../../../repositories/checkpoint-repository')
const interactionRepository = require('../../../repositories/content-interaction-repository')
const routeRepository = require('../../../repositories/route-repository')
const userRepository = require('../../../repositories/user-repository')
const {
  InteractionActionType,
  InteractionTargetType,
} = require('../../../models/content-interaction')
const { ScheduleTargetType } = require('../../../models/schedule')
const { resolveImageUrl } = require('../../../utils/local-media')

const TRAFFIC_MODE_LABELS = {
  WALKING: '步行',
  CYCLING: '骑行',
  DRIVING: '驾车',
  PUBLIC_TRANSIT: '公共交通',
  OTHER: '其他方式',
}

function getLayoutData() {
  const windowInfo = wx.getWindowInfo
    ? wx.getWindowInfo()
    : wx.getSystemInfoSync()
  const statusBarHeight = windowInfo.statusBarHeight || 20
  const menuButton = wx.getMenuButtonBoundingClientRect
    ? wx.getMenuButtonBoundingClientRect()
    : null
  const navigationBarHeight = menuButton
    ? (menuButton.top - statusBarHeight) * 2 + menuButton.height
    : 52
  const toolbarRightInset = menuButton
    ? windowInfo.windowWidth - menuButton.left + 8
    : 12
  return {
    statusBarHeight,
    navigationBarHeight,
    toolbarRightInset,
    contentTop: statusBarHeight + navigationBarHeight,
  }
}

function formatPublishedAt(value) {
  if (!Number.isFinite(value) || value <= 0) return ''
  const date = new Date(value)
  const pad = number => String(number).padStart(2, '0')
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`
}

async function hydrateStop(stop, index) {
  const checkpoint = await checkpointRepository.getPublishedCheckpointDTO(
    stop.checkpointId,
    stop.checkpointVersion
  )
  return {
    ...stop,
    viewKey: `${stop.checkpointId}:${stop.checkpointVersion}:${index}`,
    orderLabel: String(index + 1).padStart(2, '0'),
    title: checkpoint ? checkpoint.title : '打卡点已不可用',
    locationName: checkpoint ? checkpoint.location.locationName : '',
    imageUrl: checkpoint ? resolveImageUrl(checkpoint.imageId) : '',
    trafficToNextLabel: TRAFFIC_MODE_LABELS[stop.trafficToNext] || '不限',
    isAvailable: Boolean(checkpoint),
  }
}

Page({
  data: {
    ...getLayoutData(),
    route: null,
    stops: [],
    authorName: '',
    coverImageUrl: '',
    publishedAtText: '',
    currentUserId: '',
    isLiked: false,
    isFavorited: false,
    isInteractionBusy: false,
    isImportingSchedule: false,
    showShareDialog: false,
    isLoading: true,
    missing: false,
  },

  async onLoad(options) {
    const routeId = options.routeId ? decodeURIComponent(options.routeId) : ''
    const version = Number(options.version)
    if (!routeId || !Number.isInteger(version) || version <= 0) {
      this.setData({ isLoading: false, missing: true })
      return
    }
    this.shareRouteParams = { routeId, version }
    await this.loadRoute(routeId, version)
  },

  async loadRoute(routeId, version) {
    try {
      const route = await routeRepository.getPublishedRouteDTO(routeId, version)
      if (!route) {
        this.setData({ isLoading: false, missing: true })
        return
      }
      const viewCount = await routeRepository.incrementViewCount(route.routeId)
      await interactionRepository.importLegacyLikes(
        InteractionTargetType.ROUTE,
        route.routeId,
        route.likedUserIds
      )
      const currentUser = await userRepository.findCurrent()
      const [author, stops, interactionSummary] = await Promise.all([
        userRepository.findById(route.ownerUserId),
        Promise.all(route.stops.map(hydrateStop)),
        interactionRepository.findTargetSummary(
          InteractionTargetType.ROUTE,
          route.routeId,
          currentUser ? currentUser.id : ''
        ),
      ])
      this.interactionCountOffsets = {
        likeCount: Math.max(0, route.likeCount - interactionSummary.likeCount),
        favoriteCount: Math.max(
          0,
          route.favoriteCount - interactionSummary.favoriteCount
        ),
      }
      this.setData({
        route: {
          ...route,
          likeCount: this.interactionCountOffsets.likeCount
            + interactionSummary.likeCount,
          favoriteCount: this.interactionCountOffsets.favoriteCount
            + interactionSummary.favoriteCount,
          viewCount,
        },
        stops,
        authorName: author ? author.displayName : route.ownerUserId,
        coverImageUrl: resolveImageUrl(route.coverImageId),
        publishedAtText: formatPublishedAt(route.publishedAtEpochMillis),
        currentUserId: currentUser ? currentUser.id : '',
        isLiked: interactionSummary.isLiked,
        isFavorited: interactionSummary.isFavorited,
        isLoading: false,
      })
    } catch (error) {
      this.setData({ isLoading: false, missing: true })
      wx.showToast({ title: error.message || '路线加载失败', icon: 'none' })
    }
  },

  onCoverImageError() {
    this.setData({ coverImageUrl: '' })
  },

  onStopImageError(event) {
    const index = Number(event.currentTarget.dataset.index)
    if (Number.isInteger(index)) {
      this.setData({ [`stops[${index}].imageUrl`]: '' })
    }
  },

  openCheckpoint(event) {
    const { id, version, available } = event.currentTarget.dataset
    if (!available) return
    wx.navigateTo({
      url: `/pages/checkpoint/detail/checkpoint-detail?checkpointId=${encodeURIComponent(id)}&version=${version}`,
    })
  },

  async toggleInteraction(event) {
    if (this.data.isInteractionBusy) return
    if (!this.data.currentUserId) {
      wx.showToast({ title: '登录后才能进行互动', icon: 'none' })
      return
    }
    const actionType = event.currentTarget.dataset.action
    if (!Object.values(InteractionActionType).includes(actionType)) return
    this.setData({ isInteractionBusy: true })
    try {
      const result = await interactionRepository.toggleForCurrentUser(
        InteractionTargetType.ROUTE,
        this.data.route.routeId,
        actionType
      )
      const offsets = this.interactionCountOffsets || {
        likeCount: 0,
        favoriteCount: 0,
      }
      this.setData({
        isLiked: result.isLiked,
        isFavorited: result.isFavorited,
        'route.likeCount': offsets.likeCount + result.likeCount,
        'route.favoriteCount': offsets.favoriteCount + result.favoriteCount,
      })
    } catch (error) {
      wx.showToast({ title: error.message || '互动操作失败', icon: 'none' })
    } finally {
      this.setData({ isInteractionBusy: false })
    }
  },

  openShareDialog() {
    this.setData({ showShareDialog: true })
  },

  closeShareDialog() {
    this.setData({ showShareDialog: false })
  },

  preventShareDialogClose() {},

  async recordShareAttempt(routeId) {
    try {
      const shareCount = await routeRepository.incrementShareCount(routeId)
      this.setData({ 'route.shareCount': shareCount })
    } catch (error) {
      wx.showToast({ title: error.message || '转发次数记录失败', icon: 'none' })
    }
  },

  // 微信原生分享由 open-type="share" 触发，页面只负责提供分享内容
  onShareAppMessage() {
    const route = this.data.route
    const params = this.shareRouteParams
    if (!route || !params) return {}

    const shareData = {
      title: route.title || '路线详情',
      path: `/pages/route/detail/detail?routeId=${encodeURIComponent(params.routeId)}&version=${params.version}`,
    }
    if (this.data.coverImageUrl) {
      shareData.imageUrl = this.data.coverImageUrl
    }
    // 微信未提供可靠的送达回调，这里记录的是用户发起转发的次数
    this.recordShareAttempt(params.routeId)
    this.setData({ showShareDialog: false })
    return shareData
  },

  async importSchedule() {
    if (this.data.isImportingSchedule) return
    if (!this.data.currentUserId) {
      wx.showToast({ title: '登录后才能导入安排', icon: 'none' })
      return
    }

    const route = this.data.route
    const sourceRef = this.shareRouteParams
    if (!route || !sourceRef) return

    this.setData({ isImportingSchedule: true })
    try {
      // 自己的路线优先复用工作区草稿，其他公开路线复制为新的个人路线
      let draft = route.ownerUserId === this.data.currentUserId
        ? await routeRepository.findDraft(route.routeId)
        : null
      if (!draft) {
        draft = await routeRepository.createDerivedDraftRoute(sourceRef)
      }
      const query = [
        `targetType=${ScheduleTargetType.PERSONAL_ROUTE}`,
        `targetId=${encodeURIComponent(draft.routeId)}`,
        `targetVersion=${draft.version}`,
      ].join('&')
      wx.navigateTo({
        url: `/pages/schedule/editor/schedule-editor?${query}`,
      })
    } catch (error) {
      wx.showToast({ title: error.message || '路线导入失败', icon: 'none' })
    } finally {
      this.setData({ isImportingSchedule: false })
    }
  },

  goBack() {
    wx.navigateBack()
  },
})
