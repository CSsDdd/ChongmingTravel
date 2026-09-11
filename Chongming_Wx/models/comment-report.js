const CommentReportReason = Object.freeze({
  SPAM: 'SPAM',
  ABUSE: 'ABUSE',
  INAPPROPRIATE: 'INAPPROPRIATE',
  MISINFORMATION: 'MISINFORMATION',
  OTHER: 'OTHER'
})

const CommentReportStatus = Object.freeze({
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED'
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

function normalizeDetail(value) {
  if (value === undefined || value === null) return ''
  if (typeof value !== 'string') throw new Error('detail 必须是字符串')
  return value.trim()
}

function normalizeTimestamp(value, fallback) {
  return Number.isFinite(value) && value >= 0 ? value : fallback
}

function normalizeNullableTimestamp(value) {
  if (value === undefined || value === null) return null
  return normalizeTimestamp(value, null)
}

function createCommentReport(input = {}) {
  const reason = requireEnumValue(input.reason, CommentReportReason, 'reason')
  const detail = normalizeDetail(input.detail)
  if (reason === CommentReportReason.OTHER && detail === '') {
    throw new Error('选择其他原因时需要填写说明')
  }

  return {
    id: requireText(input.id, 'id'),
    commentId: requireText(input.commentId, 'commentId'),
    reporterUserId: requireText(input.reporterUserId, 'reporterUserId'),
    reason,
    detail,
    status: requireEnumValue(
      input.status || CommentReportStatus.PENDING,
      CommentReportStatus,
      'status'
    ),
    createdAtEpochMillis: normalizeTimestamp(input.createdAtEpochMillis, Date.now()),
    resolvedAtEpochMillis: normalizeNullableTimestamp(input.resolvedAtEpochMillis)
  }
}

module.exports = {
  CommentReportReason,
  CommentReportStatus,
  createCommentReport
}
