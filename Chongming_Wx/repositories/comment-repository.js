const { createInitialCommentState } = require('../data/seeds/comment-seed')
const {
  CommentStatus,
  createCommentTargetRef,
  createComment,
  createCommentLike
} = require('../models/comment')
const userRepository = require('./user-repository')

const STORAGE_KEY = 'sample-comment-repository-v1'

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function normalizeSequence(value) {
  return Number.isInteger(value) && value > 0 ? value : 1
}

function createLikeKey(like) {
  return `${like.commentId}:${like.userId}`
}

function normalizeComments(sourceComments) {
  const commentsById = new Map()

  sourceComments.forEach(item => {
    const comment = createComment(item)
    commentsById.set(comment.id, comment)
  })

  return commentsById
}

function normalizeLikes(sourceLikes, commentsById) {
  const likesByKey = new Map()

  // 点赞记录是计数的事实来源，同时在加载时去除重复和悬空记录。
  sourceLikes.forEach(item => {
    const like = createCommentLike(item)
    if (commentsById.has(like.commentId)) {
      likesByKey.set(createLikeKey(like), like)
    }
  })

  return Array.from(likesByKey.values())
}

function reconcileLikeCounts(comments, likes) {
  const countByCommentId = new Map()

  likes.forEach(like => {
    const count = countByCommentId.get(like.commentId) || 0
    countByCommentId.set(like.commentId, count + 1)
  })

  return comments.map(comment => createComment({
    ...comment,
    likeCount: countByCommentId.get(comment.id) || 0
  }))
}

function normalizeState(rawState) {
  const fallback = createInitialCommentState()
  const source = rawState && typeof rawState === 'object' ? rawState : fallback
  const sourceComments = Array.isArray(source.comments) ? source.comments : []
  const sourceLikes = Array.isArray(source.likes) ? source.likes : []
  const commentsById = normalizeComments(sourceComments)
  const likes = normalizeLikes(sourceLikes, commentsById)

  return {
    schemaVersion: 1,
    nextCommentSequence: normalizeSequence(source.nextCommentSequence),
    comments: reconcileLikeCounts(Array.from(commentsById.values()), likes),
    likes
  }
}

function loadState() {
  const stored = wx.getStorageSync(STORAGE_KEY)
  return normalizeState(stored || createInitialCommentState())
}

function saveState(state) {
  wx.setStorageSync(STORAGE_KEY, normalizeState(state))
}

function requireText(value, fieldName) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${fieldName} 不能为空`)
  }

  return value.trim()
}

async function requireCurrentUser() {
  const user = await userRepository.findCurrent()
  if (!user) {
    throw new Error('当前用户不存在')
  }

  return user
}

function allocateCommentId(state) {
  let id = ''

  do {
    id = `comment-${state.nextCommentSequence}`
    state.nextCommentSequence += 1
  } while (state.comments.some(comment => comment.id === id))

  return id
}

function compareByCreatedAt(left, right) {
  const timeDifference = left.createdAtEpochMillis - right.createdAtEpochMillis
  return timeDifference || left.id.localeCompare(right.id)
}

function targetsEqual(left, right) {
  return left.type === right.type && left.id === right.id
}

async function findById(commentId) {
  const normalizedId = requireText(commentId, 'commentId')
  const comment = loadState().comments.find(item => item.id === normalizedId)
  return comment ? clone(comment) : null
}

async function findByTarget(targetRef) {
  const normalizedTarget = createCommentTargetRef(targetRef)
  return loadState().comments
    .filter(comment => targetsEqual(comment.targetRef, normalizedTarget))
    .sort(compareByCreatedAt)
    .map(clone)
}

async function countByTarget(targetRef) {
  const comments = await findByTarget(targetRef)
  return comments.filter(comment => comment.status === CommentStatus.VISIBLE).length
}

// LOCAL DEMO：模拟评论审核服务，当前固定通过。
// 接入真实服务后只替换此函数，状态变更仍由 Repository 统一落库。
async function reviewComment(comment) {
  return true
}

async function createRoot(targetRef, content) {
  const normalizedTarget = createCommentTargetRef(targetRef)
  const currentUser = await requireCurrentUser()
  const state = loadState()
  const now = Date.now()
  const comment = createComment({
    id: allocateCommentId(state),
    authorUserId: currentUser.id,
    targetRef: normalizedTarget,
    content,
    createdAtEpochMillis: now,
    updatedAtEpochMillis: now
  })

  state.comments.push(comment)
  saveState(state)
  const isApproved = await reviewComment(clone(comment))
  return resolveReview(comment.id, isApproved)
}

async function createReply(replyToCommentId, content) {
  const normalizedReplyId = requireText(replyToCommentId, 'replyToCommentId')
  const state = loadState()
  const parent = state.comments.find(comment => comment.id === normalizedReplyId)

  if (!parent || parent.status !== CommentStatus.VISIBLE) {
    throw new Error('被回复的评论不存在或已删除')
  }

  const currentUser = await requireCurrentUser()
  const now = Date.now()

  // 回复可指向任意可见评论，但始终记录所属根评论，便于后续扁平展示。
  const comment = createComment({
    id: allocateCommentId(state),
    authorUserId: currentUser.id,
    targetRef: parent.targetRef,
    content,
    rootCommentId: parent.rootCommentId || parent.id,
    replyToCommentId: parent.id,
    createdAtEpochMillis: now,
    updatedAtEpochMillis: now
  })

  state.comments.push(comment)
  saveState(state)
  const isApproved = await reviewComment(clone(comment))
  return resolveReview(comment.id, isApproved)
}

// 统一登记审核结果，避免创建方法直接修改审核状态。
async function resolveReview(commentId, approved) {
  const normalizedId = requireText(commentId, 'commentId')
  if (typeof approved !== 'boolean') {
    throw new Error('approved 必须是布尔值')
  }

  const state = loadState()
  const index = state.comments.findIndex(comment => comment.id === normalizedId)
  if (index < 0 || state.comments[index].status !== CommentStatus.IN_REVIEW) {
    throw new Error('只有审核中的评论可以处理审核结果')
  }

  state.comments[index] = createComment({
    ...state.comments[index],
    status: approved ? CommentStatus.VISIBLE : CommentStatus.REJECTED,
    updatedAtEpochMillis: Date.now()
  })
  saveState(state)
  return clone(state.comments[index])
}

async function softDeleteForCurrentUser(commentId) {
  const normalizedId = requireText(commentId, 'commentId')
  const currentUser = await requireCurrentUser()
  const state = loadState()
  const index = state.comments.findIndex(comment => comment.id === normalizedId)

  if (index < 0) {
    throw new Error('评论不存在')
  }
  if (state.comments[index].authorUserId !== currentUser.id) {
    throw new Error('只能删除自己的评论')
  }
  if (state.comments[index].status === CommentStatus.DELETED) {
    return clone(state.comments[index])
  }

  state.comments[index] = createComment({
    ...state.comments[index],
    status: CommentStatus.DELETED,
    updatedAtEpochMillis: Date.now()
  })
  saveState(state)
  return clone(state.comments[index])
}

// 仅供举报审核等平台流程调用，与作者主动撤回保持不同状态。
async function removeByModeration(commentId) {
  const normalizedId = requireText(commentId, 'commentId')
  const state = loadState()
  const index = state.comments.findIndex(comment => comment.id === normalizedId)

  if (index < 0) throw new Error('评论不存在')
  if (state.comments[index].status === CommentStatus.REMOVED) {
    return clone(state.comments[index])
  }
  if (state.comments[index].status !== CommentStatus.VISIBLE) {
    throw new Error('只有公开评论可以由平台移除')
  }

  state.comments[index] = createComment({
    ...state.comments[index],
    status: CommentStatus.REMOVED,
    updatedAtEpochMillis: Date.now()
  })
  saveState(state)
  return clone(state.comments[index])
}

async function toggleLikeForCurrentUser(commentId) {
  const normalizedId = requireText(commentId, 'commentId')
  const currentUser = await requireCurrentUser()
  const state = loadState()
  const commentIndex = state.comments.findIndex(comment => comment.id === normalizedId)

  if (commentIndex < 0 || state.comments[commentIndex].status !== CommentStatus.VISIBLE) {
    throw new Error('评论不存在或已删除')
  }

  const likeIndex = state.likes.findIndex(like => (
    like.commentId === normalizedId && like.userId === currentUser.id
  ))
  const active = likeIndex < 0

  if (active) {
    state.likes.push(createCommentLike({ commentId: normalizedId, userId: currentUser.id }))
  } else {
    state.likes.splice(likeIndex, 1)
  }

  const oldComment = state.comments[commentIndex]
  state.comments[commentIndex] = createComment({
    ...oldComment,
    likeCount: Math.max(0, oldComment.likeCount + (active ? 1 : -1))
  })
  saveState(state)

  return {
    active,
    likeCount: state.comments[commentIndex].likeCount
  }
}

async function findLikeSummary(commentId, userId = '') {
  const [summary] = await findLikeSummaries([commentId], userId)
  return {
    likeCount: summary.likeCount,
    isLiked: summary.isLiked
  }
}

async function findLikeSummaries(commentIds, userId = '') {
  if (!Array.isArray(commentIds)) {
    throw new Error('commentIds 必须是数组')
  }

  const normalizedIds = [...new Set(commentIds.map(commentId => (
    requireText(commentId, 'commentId')
  )))]
  const state = loadState()
  const commentsById = new Map(state.comments.map(comment => [comment.id, comment]))
  const normalizedUserId = typeof userId === 'string' ? userId.trim() : ''
  const likedCommentIds = new Set(state.likes
    .filter(like => like.userId === normalizedUserId)
    .map(like => like.commentId))

  return normalizedIds.map(commentId => {
    const comment = commentsById.get(commentId)
    if (!comment) throw new Error(`评论不存在：${commentId}`)
    return {
      commentId,
      likeCount: comment.likeCount,
      isLiked: normalizedUserId !== '' && likedCommentIds.has(commentId)
    }
  })
}

module.exports = {
  findById,
  findByTarget,
  countByTarget,
  createRoot,
  createReply,
  resolveReview,
  softDeleteForCurrentUser,
  removeByModeration,
  toggleLikeForCurrentUser,
  findLikeSummary,
  findLikeSummaries
}
