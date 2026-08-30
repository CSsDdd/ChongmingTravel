const RouteTrafficMode = Object.freeze({
  WALKING: 'WALKING',
  CYCLING: 'CYCLING',
  DRIVING: 'DRIVING',
  PUBLIC_TRANSIT: 'PUBLIC_TRANSIT',
  OTHER: 'OTHER',
})

const RouteDraftReviewStatus = Object.freeze({
  NOT_SUBMITTED: 'NOT_SUBMITTED',
  IN_REVIEW: 'IN_REVIEW',
})

const SYSTEM_ROUTE_OWNER_USER_ID = 'system'

function requireText(value, fieldName) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) {
    throw new Error(`${fieldName}不能为空`)
  }
  return text
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeOwnerUserId(value) {
  const ownerUserId = normalizeText(value)
  return ownerUserId || SYSTEM_ROUTE_OWNER_USER_ID
}

function requirePositiveInteger(value, fieldName) {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${fieldName}必须是正整数`)
  }
  return value
}

function requireTimestamp(value, fieldName) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${fieldName}必须是有效时间`)
  }
  return value
}

function normalizeTimestamp(value, fallback) {
  return Number.isFinite(value) && value >= 0 ? value : fallback
}

function normalizeCount(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0
}

function normalizeStringList(value) {
  const items = Array.isArray(value) ? value : []
  return [...new Set(items.map(normalizeText).filter(Boolean))]
}

function createEngagementFields(input) {
  const likedUserIds = normalizeStringList(input.likedUserIds)
  return {
    likeCount: likedUserIds.length,
    likedUserIds,
    shareCount: normalizeCount(input.shareCount),
    favoriteCount: normalizeCount(input.favoriteCount),
    viewCount: normalizeCount(input.viewCount),
  }
}

function createSourceRouteRef(input) {
  if (input === undefined || input === null) {
    return null
  }
  if (typeof input !== 'object') {
    throw new Error('来源路线引用格式不正确')
  }
  return {
    routeId: requireText(input.routeId, '来源路线ID'),
    version: requirePositiveInteger(input.version, '来源路线版本'),
  }
}

function normalizeTrafficMode(value) {
  if (value === undefined || value === null || value === '') {
    return null
  }
  if (!Object.values(RouteTrafficMode).includes(value)) {
    throw new Error('节点交通方式不受支持')
  }
  return value
}

function createRouteStop(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('路线节点不能为空')
  }
  return {
    checkpointId: requireText(input.checkpointId, '打卡点ID'),
    checkpointVersion: requirePositiveInteger(
      input.checkpointVersion,
      '打卡点版本'
    ),
    note: normalizeText(input.note),
    trafficToNext: normalizeTrafficMode(input.trafficToNext),
  }
}

function createRouteContent(input) {
  if (!Array.isArray(input.stops)) {
    throw new Error('路线节点必须是数组')
  }
  return {
    title: requireText(input.title, '路线标题'),
    description: requireText(input.description, '路线介绍'),
    note: normalizeText(input.note),
    coverImageId: normalizeText(input.coverImageId),
    tagIds: normalizeStringList(input.tagIds),
    stops: input.stops.map(createRouteStop),
  }
}

/**
 * 创建路线主体。
 *
 * Route 保存稳定身份、派生来源、正式版本指针和公开互动统计；
 * 路线详细内容保存在 RouteVersion 和 RouteDraft 中。
 */
function createRoute(input) {
  const now = Date.now()
  return {
    id: requireText(input.id, '路线ID'),
    ownerUserId: normalizeOwnerUserId(input.ownerUserId),
    sourceRouteRef: createSourceRouteRef(input.sourceRouteRef),
    latestVersion: normalizeCount(input.latestVersion),
    currentPublishedVersion: input.currentPublishedVersion ?? null,
    createdAtEpochMillis: normalizeTimestamp(input.createdAtEpochMillis, now),
    ...createEngagementFields(input),
  }
}

function createRouteVersion(input) {
  return {
    routeId: requireText(input.routeId, '路线ID'),
    ownerUserId: normalizeOwnerUserId(input.ownerUserId),
    version: requirePositiveInteger(input.version, '路线版本'),
    ...createRouteContent(input),
    publishedAtEpochMillis: requireTimestamp(
      input.publishedAtEpochMillis,
      '路线发布时间'
    ),
  }
}

function createRouteDraft(input) {
  const now = Date.now()
  const createdAt = normalizeTimestamp(input.createdAtEpochMillis, now)
  const reviewStatus = Object.values(RouteDraftReviewStatus)
    .includes(input.reviewStatus)
    ? input.reviewStatus
    : RouteDraftReviewStatus.NOT_SUBMITTED
  return {
    routeId: requireText(input.routeId, '路线ID'),
    ownerUserId: normalizeOwnerUserId(input.ownerUserId),
    version: requirePositiveInteger(input.version, '路线版本'),
    ...createRouteContent(input),
    reviewStatus,
    createdAtEpochMillis: createdAt,
    updatedAtEpochMillis: normalizeTimestamp(
      input.updatedAtEpochMillis,
      createdAt
    ),
  }
}

module.exports = {
  RouteDraftReviewStatus,
  RouteTrafficMode,
  SYSTEM_ROUTE_OWNER_USER_ID,
  createRoute,
  createRouteDraft,
  createRouteStop,
  createRouteVersion,
}
