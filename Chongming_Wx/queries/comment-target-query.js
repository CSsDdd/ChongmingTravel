const checkpointRepository = require('../repositories/checkpoint-repository')
const routeRepository = require('../repositories/route-repository')
const {
  CommentTargetType,
  createCommentTargetRef
} = require('../models/comment')

function createCheckpointSummary(targetRef, checkpoint) {
  return {
    targetRef,
    title: checkpoint.title,
    summary: checkpoint.shortText,
    metaText: checkpoint.location?.locationName || '',
    tagText: checkpoint.tagText,
    imageId: checkpoint.imageId,
    source: 'PUBLISHED',
    sourceLabel: '公开',
    typeLabel: '打卡点'
  }
}

function createRouteSummary(targetRef, route) {
  return {
    targetRef,
    title: route.title,
    summary: route.description,
    metaText: `${route.checkpointCount} 个打卡点`,
    tagText: route.tagIds.join(' · '),
    imageId: route.coverImageId,
    source: 'PUBLISHED',
    sourceLabel: '公开',
    typeLabel: '路线'
  }
}

// 评论绑定内容身份；标题始终从对应内容的当前公开版本解析。
async function resolveCommentTarget(targetRef) {
  const normalizedTarget = createCommentTargetRef(targetRef)

  if (normalizedTarget.type === CommentTargetType.CHECKPOINT) {
    const checkpoints = await checkpointRepository.getPublishedCheckpointDTOs()
    const checkpoint = checkpoints.find(item => (
      item.checkpointId === normalizedTarget.id
    ))
    return checkpoint
      ? createCheckpointSummary(normalizedTarget, checkpoint)
      : null
  }

  const routes = await routeRepository.getPublishedRouteDTOs()
  const route = routes.find(item => item.routeId === normalizedTarget.id)
  return route ? createRouteSummary(normalizedTarget, route) : null
}

module.exports = {
  resolveCommentTarget
}
