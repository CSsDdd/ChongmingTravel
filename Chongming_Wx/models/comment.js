const CommentTargetType = Object.freeze({
  CHECKPOINT: 'CHECKPOINT',
  ROUTE: 'ROUTE'
})

const CommentStatus = Object.freeze({
  IN_REVIEW: 'IN_REVIEW',
  VISIBLE: 'VISIBLE',
  REJECTED: 'REJECTED',
  DELETED: 'DELETED',
  REMOVED: 'REMOVED'
})

function requireText(value, fieldName) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${fieldName} 不能为空`)
  }

  return value.trim()
}

function requireEnumValue(value, enumObject, fieldName) {
  if (!Object.values(enumObject).includes(value)) {
    throw new Error(`${fieldName} 的值无效`)
  }

  return value
}

function normalizeTimestamp(value, fallback) {
  return Number.isFinite(value) && value >= 0 ? value : fallback
}

function normalizeCount(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0
}

function normalizeNullableId(value, fieldName) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  return requireText(value, fieldName)
}

function createCommentTargetRef(input = {}) {
  return {
    type: requireEnumValue(input.type, CommentTargetType, 'targetRef.type'),
    id: requireText(input.id, 'targetRef.id')
  }
}

function createComment(input = {}) {
  const now = Date.now()
  const rootCommentId = normalizeNullableId(input.rootCommentId, 'rootCommentId')
  const replyToCommentId = normalizeNullableId(input.replyToCommentId, 'replyToCommentId')

  if ((rootCommentId === null) !== (replyToCommentId === null)) {
    throw new Error('评论回复关系不完整')
  }

  return {
    id: requireText(input.id, 'id'),
    authorUserId: requireText(input.authorUserId, 'authorUserId'),
    targetRef: createCommentTargetRef(input.targetRef),
    content: requireText(input.content, 'content'),
    rootCommentId,
    replyToCommentId,
    likeCount: normalizeCount(input.likeCount),
    status: requireEnumValue(input.status || CommentStatus.IN_REVIEW, CommentStatus, 'status'),
    createdAtEpochMillis: normalizeTimestamp(input.createdAtEpochMillis, now),
    updatedAtEpochMillis: normalizeTimestamp(input.updatedAtEpochMillis, now)
  }
}

function createCommentLike(input = {}) {
  return {
    commentId: requireText(input.commentId, 'commentId'),
    userId: requireText(input.userId, 'userId'),
    createdAtEpochMillis: normalizeTimestamp(input.createdAtEpochMillis, Date.now())
  }
}

module.exports = {
  CommentTargetType,
  CommentStatus,
  createCommentTargetRef,
  createComment,
  createCommentLike
}
