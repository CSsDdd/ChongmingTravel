const InteractionTargetType = Object.freeze({
  ROUTE: 'ROUTE',
  CHECKPOINT: 'CHECKPOINT',
})

const InteractionActionType = Object.freeze({
  LIKE: 'LIKE',
  FAVORITE: 'FAVORITE',
})

function requireEnumValue(value, enumObject, fieldName) {
  if (!Object.values(enumObject).includes(value)) {
    throw new Error(`${fieldName}不受支持`)
  }
  return value
}

function requireText(value, fieldName) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) {
    throw new Error(`${fieldName}不能为空`)
  }
  return text
}

function createContentInteraction(input) {
  return {
    userId: requireText(input.userId, '用户ID'),
    targetType: requireEnumValue(
      input.targetType,
      InteractionTargetType,
      '互动目标类型'
    ),
    targetId: requireText(input.targetId, '互动目标ID'),
    actionType: requireEnumValue(
      input.actionType,
      InteractionActionType,
      '互动类型'
    ),
    createdAtEpochMillis: Number.isFinite(input.createdAtEpochMillis)
      ? input.createdAtEpochMillis
      : Date.now(),
  }
}

module.exports = {
  InteractionActionType,
  InteractionTargetType,
  createContentInteraction,
}
