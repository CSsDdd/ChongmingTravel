function requireObject(value, fieldName) {
  if (!value || typeof value !== 'object') {
    throw new Error(`${fieldName}不能为空`)
  }
  return value
}

function cloneLocation(value) {
  return value
    ? {
        latitude: value.latitude,
        longitude: value.longitude,
        locationName: value.locationName,
        coordinateSystem: value.coordinateSystem,
      }
    : null
}

/**
 * 将公开 Checkpoint 主体与指定 CheckpointVersion 组合成页面传输数据。
 * DTO 不写回 Storage，嵌套数组和对象均复制后返回。
 */
function createPublishedCheckpointDto(checkpointInput, versionInput) {
  const checkpoint = requireObject(checkpointInput, '打卡点主体')
  const version = requireObject(versionInput, '打卡点版本')
  if (checkpoint.id !== version.checkpointId) {
    throw new Error('打卡点主体与打卡点版本不匹配')
  }
  if (checkpoint.ownerUserId !== version.ownerUserId) {
    throw new Error('打卡点主体与打卡点版本的所有者不一致')
  }

  const tagIds = [...version.tagIds]
  return {
    checkpointId: checkpoint.id,
    ownerUserId: checkpoint.ownerUserId,
    version: version.version,
    location: cloneLocation(version.location),
    title: version.title,
    shortText: version.shortText,
    imageId: version.imageId,
    tagIds,
    tagText: tagIds.join(' · '),
    likeCount: checkpoint.likeCount,
    likedUserIds: [...checkpoint.likedUserIds],
    shareCount: checkpoint.shareCount,
    favoriteCount: checkpoint.favoriteCount,
    viewCount: checkpoint.viewCount,
    publishedAtEpochMillis: version.publishedAtEpochMillis,
  }
}

module.exports = {
  createPublishedCheckpointDto,
}
