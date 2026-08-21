function requireObject(value, fieldName) {
  if (!value || typeof value !== 'object') {
    throw new Error(`${fieldName}不能为空`)
  }
  return value
}

function cloneSourceRouteRef(value) {
  return value
    ? {
        routeId: value.routeId,
        version: value.version,
      }
    : null
}

function cloneStops(value) {
  return value.map(stop => ({
    checkpointId: stop.checkpointId,
    checkpointVersion: stop.checkpointVersion,
    note: stop.note,
    trafficToNext: stop.trafficToNext,
  }))
}

/**
 * 将公开 Route 主体与指定 RouteVersion 组合成只用于传输的页面数据。
 * DTO 不写回 Storage，嵌套数组和对象均复制后返回。
 */
function createPublishedRouteDto(routeInput, versionInput) {
  const route = requireObject(routeInput, '路线主体')
  const version = requireObject(versionInput, '路线版本')
  if (route.id !== version.routeId) {
    throw new Error('路线主体与路线版本不匹配')
  }
  if (route.ownerUserId !== version.ownerUserId) {
    throw new Error('路线主体与路线版本的所有者不一致')
  }

  const tagIds = [...version.tagIds]
  const stops = cloneStops(version.stops)
  return {
    routeId: route.id,
    ownerUserId: route.ownerUserId,
    sourceRouteRef: cloneSourceRouteRef(route.sourceRouteRef),
    version: version.version,
    title: version.title,
    description: version.description,
    note: version.note,
    coverImageId: version.coverImageId,
    tagIds,
    stops,
    checkpointCount: stops.length,
    likeCount: route.likeCount,
    likedUserIds: [...route.likedUserIds],
    shareCount: route.shareCount,
    favoriteCount: route.favoriteCount,
    createdAtEpochMillis: route.createdAtEpochMillis,
    publishedAtEpochMillis: version.publishedAtEpochMillis,
  }
}

module.exports = {
  createPublishedRouteDto,
}
