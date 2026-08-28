const CoordinateSystem = Object.freeze({
  WGS84: 'WGS84',
  GCJ02: 'GCJ02',
})

const CheckpointDraftReviewStatus = Object.freeze({
  NOT_SUBMITTED: 'NOT_SUBMITTED',
  IN_REVIEW: 'IN_REVIEW',
})

const SYSTEM_CHECKPOINT_OWNER_USER_ID = 'system'

function normalizeOwnerUserId(value) {
  const ownerUserId = typeof value === 'string' ? value.trim() : ''
  return ownerUserId || SYSTEM_CHECKPOINT_OWNER_USER_ID
}

function normalizeCount(value) {
  const count = Number(value)
  return Number.isInteger(count) && count >= 0 ? count : 0
}

function normalizeStringList(value) {
  const items = Array.isArray(value) ? value : []
  return [...new Set(items
    .map(item => typeof item === 'string' ? item.trim() : '')
    .filter(Boolean))]
}

function createEngagementFields(input) {
  const likedUserIds = normalizeStringList(input.likedUserIds)
  return {
    likeCount: likedUserIds.length,
    likedUserIds,
    shareCount: normalizeCount(input.shareCount),
    favoriteCount: normalizeCount(input.favoriteCount),
  }
}

/**
 * 创建打卡点主体。
 *
 * Checkpoint 只保存稳定身份和正式版本指针；标题、位置、图片等详细信息
 * 保存在 CheckpointVersion（以及可编辑的 Draft）中。
 * `Checkpoint.id` 与 `CheckpointVersion.checkpointId` 表示同一个 ID。
 */
function createCheckpoint(input) {
  return {
    id: input.id,
    ownerUserId: normalizeOwnerUserId(input.ownerUserId),
    latestVersion: input.latestVersion ?? 0,
    currentPublishedVersion: input.currentPublishedVersion ?? null,
    ...createEngagementFields(input),
  }
}

function createCheckpointVersion(input) {
  return {
    checkpointId: input.checkpointId,
    ownerUserId: normalizeOwnerUserId(input.ownerUserId),
    version: input.version,
    location: input.location,
    title: input.title,
    shortText: input.shortText,
    imageId: input.imageId,
    tagIds: [...input.tagIds],
    tagText: input.tagIds.join(' · '),
    publishedAtEpochMillis: input.publishedAtEpochMillis,
  }
}

function createCheckpointDraft(input) {
  const versionFields = createCheckpointVersion({
    ...input,
    publishedAtEpochMillis: null,
  })
  const reviewStatus = Object.values(CheckpointDraftReviewStatus)
    .includes(input.reviewStatus)
    ? input.reviewStatus
    : CheckpointDraftReviewStatus.NOT_SUBMITTED
  const { publishedAtEpochMillis, ...draftFields } = versionFields

  return {
    ...draftFields,
    reviewStatus,
  }
}

module.exports = {
  CheckpointDraftReviewStatus,
  CoordinateSystem,
  SYSTEM_CHECKPOINT_OWNER_USER_ID,
  createCheckpoint,
  createCheckpointDraft,
  createCheckpointVersion,
}
