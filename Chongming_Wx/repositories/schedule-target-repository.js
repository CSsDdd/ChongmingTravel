const checkpointRepository = require('./checkpoint-repository')
const routeRepository = require('./route-repository')
const userRepository = require('./user-repository')
const { ScheduleTargetType } = require('../models/schedule')

const ScheduleTargetSource = Object.freeze({
  PUBLISHED: 'PUBLISHED',
  OWN_DRAFT: 'OWN_DRAFT',
})

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function createCheckpointTarget(checkpoint, source) {
  const isDraft = source === ScheduleTargetSource.OWN_DRAFT
  return {
    targetRef: {
      type: ScheduleTargetType.CHECKPOINT,
      id: checkpoint.checkpointId,
      version: checkpoint.version,
    },
    title: checkpoint.title,
    summary: checkpoint.shortText,
    metaText: checkpoint.location?.locationName || '',
    tagText: Array.isArray(checkpoint.tagIds)
      ? checkpoint.tagIds.join(' · ')
      : '',
    imageId: checkpoint.imageId,
    source,
    sourceLabel: isDraft ? '我的草稿' : '公开',
    typeLabel: '打卡点',
  }
}

function createRouteTarget(route) {
  return {
    targetRef: {
      type: ScheduleTargetType.PERSONAL_ROUTE,
      id: route.routeId,
      version: route.version,
    },
    title: route.title,
    summary: route.description,
    metaText: `${route.stops.length} 个打卡点`,
    tagText: Array.isArray(route.tagIds) ? route.tagIds.join(' · ') : '',
    imageId: route.coverImageId,
    source: ScheduleTargetSource.OWN_DRAFT,
    sourceLabel: '我的草稿',
    typeLabel: '路线',
  }
}

function matchesQuery(target, query) {
  if (query.targetType && query.targetType !== 'ALL'
    && target.targetRef.type !== query.targetType) {
    return false
  }
  const text = String(query.text || '').normalize('NFKC').trim().toLowerCase()
  if (!text) return true
  return [target.title, target.summary, target.metaText, target.tagText]
    .some(value => String(value || '').normalize('NFKC').toLowerCase()
      .includes(text))
}

function addViewKeys(targets) {
  return targets.map(target => ({
    ...target,
    viewKey: [
      target.targetRef.type,
      target.targetRef.id,
      target.targetRef.version,
      target.source,
    ].join(':'),
  }))
}

// Schedule 的可选范围包含公开打卡点，以及当前用户自己的两类草稿
async function searchAvailableTargets(query = {}) {
  const currentUser = await userRepository.findCurrent()
  const [publishedCheckpoints, checkpointDrafts, routeDrafts] = await Promise.all([
    checkpointRepository.getPublishedCheckpointDTOs(),
    currentUser ? checkpointRepository.findDrafts() : [],
    currentUser ? routeRepository.findDrafts() : [],
  ])
  const targets = [
    ...checkpointDrafts.map(item => createCheckpointTarget(
      item,
      ScheduleTargetSource.OWN_DRAFT
    )),
    ...routeDrafts.map(createRouteTarget),
    ...publishedCheckpoints.map(item => createCheckpointTarget(
      item,
      ScheduleTargetSource.PUBLISHED
    )),
  ]
  return clone(addViewKeys(targets.filter(target => matchesQuery(target, query))))
}

module.exports = {
  ScheduleTargetSource,
  searchAvailableTargets,
}
