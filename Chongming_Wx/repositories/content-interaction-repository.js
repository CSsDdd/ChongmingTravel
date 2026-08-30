const {
  createInitialContentInteractionState,
} = require('../data/seeds/content-interaction-seed')
const {
  InteractionActionType,
  createContentInteraction,
} = require('../models/content-interaction')
const userRepository = require('./user-repository')

const STORAGE_KEY = 'sample-content-interactions-repository-v1'

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function normalizeState(rawState) {
  const source = rawState && Array.isArray(rawState.interactions)
    ? rawState
    : createInitialContentInteractionState()
  const interactionsByKey = new Map()
  source.interactions.map(createContentInteraction).forEach(interaction => {
    const key = [
      interaction.userId,
      interaction.targetType,
      interaction.targetId,
      interaction.actionType,
    ].join(':')
    interactionsByKey.set(key, interaction)
  })
  return {
    schemaVersion: Number.isInteger(source.schemaVersion)
      && source.schemaVersion > 0
      ? source.schemaVersion
      : 1,
    interactions: [...interactionsByKey.values()],
  }
}

function loadState() {
  return normalizeState(wx.getStorageSync(STORAGE_KEY))
}

function saveState(state) {
  wx.setStorageSync(STORAGE_KEY, state)
}

function matchesTarget(interaction, targetType, targetId) {
  return interaction.targetType === targetType
    && interaction.targetId === targetId
}

function createTargetSummary(state, targetType, targetId, userId) {
  const targetInteractions = state.interactions.filter(interaction => (
    matchesTarget(interaction, targetType, targetId)
  ))
  return {
    isLiked: targetInteractions.some(interaction => (
      interaction.userId === userId
      && interaction.actionType === InteractionActionType.LIKE
    )),
    isFavorited: targetInteractions.some(interaction => (
      interaction.userId === userId
      && interaction.actionType === InteractionActionType.FAVORITE
    )),
    likeCount: targetInteractions.filter(interaction => (
      interaction.actionType === InteractionActionType.LIKE
    )).length,
    favoriteCount: targetInteractions.filter(interaction => (
      interaction.actionType === InteractionActionType.FAVORITE
    )).length,
  }
}

async function findTargetSummary(targetType, targetId, userId = '') {
  const probe = createContentInteraction({
    userId: userId || 'anonymous',
    targetType,
    targetId,
    actionType: InteractionActionType.LIKE,
    createdAtEpochMillis: 0,
  })
  return clone(createTargetSummary(
    loadState(),
    probe.targetType,
    probe.targetId,
    userId
  ))
}

async function toggleForCurrentUser(targetType, targetId, actionType) {
  const currentUser = await userRepository.findCurrent()
  if (!currentUser) {
    throw new Error('登录后才能进行互动')
  }
  const interaction = createContentInteraction({
    userId: currentUser.id,
    targetType,
    targetId,
    actionType,
  })
  const state = loadState()
  const index = state.interactions.findIndex(item => (
    item.userId === interaction.userId
    && item.targetType === interaction.targetType
    && item.targetId === interaction.targetId
    && item.actionType === interaction.actionType
  ))
  const active = index < 0
  if (active) {
    state.interactions.push(interaction)
  } else {
    state.interactions.splice(index, 1)
  }
  saveState(state)
  return clone({
    active,
    ...createTargetSummary(
      state,
      interaction.targetType,
      interaction.targetId,
      currentUser.id
    ),
  })
}

async function importLegacyLikes(targetType, targetId, userIds) {
  const state = loadState()
  const existingUserIds = new Set(state.interactions
    .filter(interaction => (
      matchesTarget(interaction, targetType, targetId)
      && interaction.actionType === InteractionActionType.LIKE
    ))
    .map(interaction => interaction.userId))
  let changed = false
  for (const userId of Array.isArray(userIds) ? userIds : []) {
    if (existingUserIds.has(userId)) continue
    state.interactions.push(createContentInteraction({
      userId,
      targetType,
      targetId,
      actionType: InteractionActionType.LIKE,
      createdAtEpochMillis: 0,
    }))
    existingUserIds.add(userId)
    changed = true
  }
  if (changed) saveState(state)
}

async function findByUser(userId, actionType) {
  const results = loadState().interactions.filter(interaction => (
    interaction.userId === userId
    && (!actionType || interaction.actionType === actionType)
  ))
  return clone(results)
}

async function findByTarget(targetType, targetId, actionType) {
  const results = loadState().interactions.filter(interaction => (
    matchesTarget(interaction, targetType, targetId)
    && (!actionType || interaction.actionType === actionType)
  ))
  return clone(results)
}

module.exports = {
  findByTarget,
  findByUser,
  findTargetSummary,
  importLegacyLikes,
  toggleForCurrentUser,
}
