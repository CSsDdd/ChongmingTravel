const ScheduleTargetType = Object.freeze({
  CHECKPOINT: 'CHECKPOINT',
  PERSONAL_ROUTE: 'PERSONAL_ROUTE',
})

const SchedulePlanningStatus = Object.freeze({
  CONFIRMED: 'CONFIRMED',
  INTERESTED: 'INTERESTED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
})

const ScheduleRecruitmentStatus = Object.freeze({
  NOT_RECRUITING: 'NOT_RECRUITING',
  RECRUITING: 'RECRUITING',
  CLOSED: 'CLOSED',
})

const ScheduleVisibility = Object.freeze({
  PRIVATE: 'PRIVATE',
  PUBLIC: 'PUBLIC',
})

/**
 * @typedef {Object} ScheduleTargetRef
 * @property {string} type
 * @property {string} id
 * @property {number} version
 */

/**
 * @typedef {Object} Schedule
 * @property {string} id
 * @property {string} ownerUserId
 * @property {number} startAtEpochMillis
 * @property {number} endAtEpochMillis
 * @property {ScheduleTargetRef} targetRef
 * @property {string} planningStatus
 * @property {string} recruitmentStatus
 * @property {string} visibility
 * @property {string} sharedNote
 * @property {string} privateNote
 * @property {string|null} sourceInvitationId
 * @property {number} createdAtEpochMillis
 * @property {number} updatedAtEpochMillis
 */

function requireText(value, fieldName) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) {
    throw new Error(`${fieldName}不能为空`)
  }
  return text
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

function normalizeEnum(value, enumObject, fallback, fieldName) {
  const candidate = value === undefined || value === null
    ? fallback
    : value
  if (!Object.values(enumObject).includes(candidate)) {
    throw new Error(`${fieldName}不受支持`)
  }
  return candidate
}

function createScheduleTargetRef(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('安排目标引用不能为空')
  }
  if (!Number.isInteger(input.version) || input.version < 1) {
    throw new Error('目标版本必须是正整数')
  }

  return {
    type: normalizeEnum(
      input.type,
      ScheduleTargetType,
      null,
      '目标类型'
    ),
    id: requireText(input.id, '目标ID'),
    version: input.version,
  }
}

function normalizeOptionalText(value) {
  const text = typeof value === 'string' ? value.trim() : ''
  return text || null
}

function canScheduleRecruit(planningStatus, visibility) {
  const hasActiveIntent = (
    planningStatus === SchedulePlanningStatus.CONFIRMED
    || planningStatus === SchedulePlanningStatus.INTERESTED
  )
  return hasActiveIntent && visibility !== ScheduleVisibility.PRIVATE
}

function validateStateCombination(planningStatus, recruitmentStatus, visibility) {
  if (recruitmentStatus === ScheduleRecruitmentStatus.RECRUITING
    && !canScheduleRecruit(planningStatus, visibility)) {
    throw new Error('当前安排状态或可见性不允许招募')
  }
}

/**
 * 创建结构统一、目标版本确定的安排。
 * @param {Partial<Schedule> & {
 *   id: string,
 *   ownerUserId: string,
 *   startAtEpochMillis: number,
 *   endAtEpochMillis: number,
 *   targetRef: ScheduleTargetRef
 * }} input
 * @returns {Schedule}
 */
function createSchedule(input) {
  const startAt = requireTimestamp(input.startAtEpochMillis, '开始时间')
  const endAt = requireTimestamp(input.endAtEpochMillis, '结束时间')
  if (endAt <= startAt) {
    throw new Error('结束时间必须晚于开始时间')
  }

  const planningStatus = normalizeEnum(
    input.planningStatus,
    SchedulePlanningStatus,
    SchedulePlanningStatus.CONFIRMED,
    '计划状态'
  )
  const recruitmentStatus = normalizeEnum(
    input.recruitmentStatus,
    ScheduleRecruitmentStatus,
    ScheduleRecruitmentStatus.NOT_RECRUITING,
    '招募状态'
  )
  const visibility = normalizeEnum(
    input.visibility,
    ScheduleVisibility,
    ScheduleVisibility.PRIVATE,
    '可见性'
  )
  validateStateCombination(planningStatus, recruitmentStatus, visibility)

  const now = Date.now()
  const createdAt = normalizeTimestamp(input.createdAtEpochMillis, now)
  return {
    id: requireText(input.id, '安排ID'),
    ownerUserId: requireText(input.ownerUserId, '所属用户ID'),
    startAtEpochMillis: startAt,
    endAtEpochMillis: endAt,
    targetRef: createScheduleTargetRef(input.targetRef),
    planningStatus,
    recruitmentStatus,
    visibility,
    sharedNote: typeof input.sharedNote === 'string'
      ? input.sharedNote.trim()
      : '',
    privateNote: typeof input.privateNote === 'string'
      ? input.privateNote.trim()
      : '',
    sourceInvitationId: normalizeOptionalText(input.sourceInvitationId),
    createdAtEpochMillis: createdAt,
    updatedAtEpochMillis: normalizeTimestamp(
      input.updatedAtEpochMillis,
      createdAt
    ),
  }
}

module.exports = {
  SchedulePlanningStatus,
  ScheduleRecruitmentStatus,
  ScheduleTargetType,
  ScheduleVisibility,
  canScheduleRecruit,
  createSchedule,
  createScheduleTargetRef,
}
