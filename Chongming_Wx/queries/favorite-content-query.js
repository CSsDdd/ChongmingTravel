const checkpointRepository = require('../repositories/checkpoint-repository')
const contentInteractionRepository = require('../repositories/content-interaction-repository')
const routeRepository = require('../repositories/route-repository')
const userRepository = require('../repositories/user-repository')
const {
  InteractionActionType,
  InteractionTargetType,
} = require('../models/content-interaction')

const FavoriteTargetType = Object.freeze({
  ALL: 'ALL',
  CHECKPOINT: InteractionTargetType.CHECKPOINT,
  ROUTE: InteractionTargetType.ROUTE,
})

function normalizeText(value) {
  return String(value || '').normalize('NFKC').trim().toLowerCase()
}

function createCheckpointCard(checkpoint, interaction) {
  return {
    key: `CHECKPOINT:${checkpoint.checkpointId}`,
    type: InteractionTargetType.CHECKPOINT,
    typeLabel: '打卡点',
    id: checkpoint.checkpointId,
    version: checkpoint.version,
    title: checkpoint.title,
    summary: checkpoint.shortText,
    metaText: checkpoint.location?.locationName || '',
    imageId: checkpoint.imageId,
    tagText: checkpoint.tagText,
    favoritedAtEpochMillis: interaction.createdAtEpochMillis,
  }
}

function createRouteCard(route, interaction) {
  return {
    key: `ROUTE:${route.routeId}`,
    type: InteractionTargetType.ROUTE,
    typeLabel: '路线',
    id: route.routeId,
    version: route.version,
    title: route.title,
    summary: route.description,
    metaText: `${route.checkpointCount} 个打卡点`,
    imageId: route.coverImageId,
    tagText: route.tagIds.join(' · '),
    favoritedAtEpochMillis: interaction.createdAtEpochMillis,
  }
}

function createContentMaps(checkpoints, routes) {
  return {
    checkpoints: new Map(checkpoints.map(item => [item.checkpointId, item])),
    routes: new Map(routes.map(item => [item.routeId, item])),
  }
}

function resolveFavoriteCard(interaction, contentMaps) {
  if (interaction.targetType === InteractionTargetType.CHECKPOINT) {
    const checkpoint = contentMaps.checkpoints.get(interaction.targetId)
    return checkpoint ? createCheckpointCard(checkpoint, interaction) : null
  }
  if (interaction.targetType === InteractionTargetType.ROUTE) {
    const route = contentMaps.routes.get(interaction.targetId)
    return route ? createRouteCard(route, interaction) : null
  }
  return null
}

function matchesQuery(item, query) {
  if (query.targetType && query.targetType !== FavoriteTargetType.ALL
    && item.type !== query.targetType) {
    return false
  }
  const text = normalizeText(query.text)
  if (!text) return true
  return [item.title, item.summary, item.metaText, item.tagText]
    .some(value => normalizeText(value).includes(text))
}

// 收藏记录保存内容身份；查询时组合两类内容的当前公开版本。
async function searchCurrentUserFavorites(query = {}) {
  const currentUser = await userRepository.findCurrent()
  if (!currentUser) return { isLoggedIn: false, items: [] }

  const [interactions, checkpoints, routes] = await Promise.all([
    contentInteractionRepository.findByUser(
      currentUser.id,
      InteractionActionType.FAVORITE
    ),
    checkpointRepository.getPublishedCheckpointDTOs(),
    routeRepository.getPublishedRouteDTOs(),
  ])
  const contentMaps = createContentMaps(checkpoints, routes)
  const items = interactions
    .map(interaction => resolveFavoriteCard(interaction, contentMaps))
    .filter(Boolean)
    .filter(item => matchesQuery(item, query))
    .sort((left, right) => (
      right.favoritedAtEpochMillis - left.favoritedAtEpochMillis
    ))
  return { isLoggedIn: true, items }
}

module.exports = {
  FavoriteTargetType,
  searchCurrentUserFavorites,
}
