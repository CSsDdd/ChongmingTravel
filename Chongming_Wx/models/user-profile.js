const AgeGroup = Object.freeze({
  UNDER_12: 'UNDER_12',
  AGE_12_TO_15: 'AGE_12_TO_15',
  AGE_16_TO_18: 'AGE_16_TO_18',
  ADULT: 'ADULT',
  UNDISCLOSED: 'UNDISCLOSED',
})

/**
 * @typedef {Object} UserProfile
 * @property {string} userId
 * @property {string} ageGroup
 * @property {string[]} skillTagIds
 * @property {string[]} interestTagIds
 * @property {string} signature
 * @property {string} bio
 * @property {number} updatedAtEpochMillis
 */

function requireUserId(value) {
  const userId = typeof value === 'string' ? value.trim() : ''
  if (!userId) {
    throw new Error('用户ID不能为空')
  }
  return userId
}

function normalizeTagIds(value) {
  if (!Array.isArray(value)) {
    return []
  }

  const tagIds = value
    .filter(tagId => typeof tagId === 'string')
    .map(tagId => tagId.trim())
    .filter(Boolean)
  return [...new Set(tagIds)]
}

function normalizeAgeGroup(value) {
  return Object.values(AgeGroup).includes(value)
    ? value
    : AgeGroup.UNDISCLOSED
}

/**
 * 创建结构统一的用户个人资料。
 * @param {Partial<UserProfile> & {userId: string}} input
 * @returns {UserProfile}
 */
function createUserProfile(input) {
  return {
    userId: requireUserId(input.userId),
    ageGroup: normalizeAgeGroup(input.ageGroup),
    skillTagIds: normalizeTagIds(input.skillTagIds),
    interestTagIds: normalizeTagIds(input.interestTagIds),
    signature: typeof input.signature === 'string'
      ? input.signature.trim()
      : '',
    bio: typeof input.bio === 'string' ? input.bio.trim() : '',
    updatedAtEpochMillis: Number.isFinite(input.updatedAtEpochMillis)
      && input.updatedAtEpochMillis >= 0
      ? input.updatedAtEpochMillis
      : Date.now(),
  }
}

module.exports = {
  AgeGroup,
  createUserProfile,
}
