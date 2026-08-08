const DEFAULT_AVATAR_IMAGE_ID = 'default/user_avatar'

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} displayName
 * @property {string} avatarImageId
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

function normalizeTimestamp(value, fallback) {
  return Number.isFinite(value) && value >= 0 ? value : fallback
}

/**
 * 规范化一个已经获得内部ID的用户对象。
 * @param {Partial<User> & {id: string, displayName: string}} input
 * @returns {User}
 */
function createUser(input) {
  const now = Date.now()
  const createdAt = normalizeTimestamp(input.createdAtEpochMillis, now)

  return {
    id: requireText(input.id, '用户ID'),
    displayName: requireText(input.displayName, '用户名称'),
    avatarImageId: input.avatarImageId || DEFAULT_AVATAR_IMAGE_ID,
    createdAtEpochMillis: createdAt,
    updatedAtEpochMillis: normalizeTimestamp(
      input.updatedAtEpochMillis,
      createdAt
    ),
  }
}

module.exports = {
  DEFAULT_AVATAR_IMAGE_ID,
  createUser,
}
