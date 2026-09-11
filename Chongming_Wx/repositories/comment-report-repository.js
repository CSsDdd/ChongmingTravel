const { createInitialCommentReportState } = require('../data/seeds/comment-report-seed')
const {
  CommentReportStatus,
  createCommentReport
} = require('../models/comment-report')
const { CommentStatus } = require('../models/comment')
const commentRepository = require('./comment-repository')
const userRepository = require('./user-repository')

const STORAGE_KEY = 'sample-comment-report-repository-v1'

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function normalizeSequence(value) {
  return Number.isInteger(value) && value > 0 ? value : 1
}

function normalizeState(rawState) {
  const fallback = createInitialCommentReportState()
  const source = rawState && typeof rawState === 'object' ? rawState : fallback
  const sourceReports = Array.isArray(source.reports) ? source.reports : []
  const reportsById = new Map()

  sourceReports.forEach(item => {
    const report = createCommentReport(item)
    reportsById.set(report.id, report)
  })

  return {
    schemaVersion: 1,
    nextReportSequence: normalizeSequence(source.nextReportSequence),
    reports: Array.from(reportsById.values())
  }
}

function loadState() {
  const stored = wx.getStorageSync(STORAGE_KEY)
  return normalizeState(stored || createInitialCommentReportState())
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

function allocateReportId(state) {
  let id = ''
  do {
    id = `comment-report-${state.nextReportSequence}`
    state.nextReportSequence += 1
  } while (state.reports.some(report => report.id === id))
  return id
}

// LOCAL DEMO：模拟举报审核服务，true 表示举报成立。
async function reviewReport(report) {
  return true
}

async function resolveReview(reportId, accepted) {
  const normalizedId = requireText(reportId, 'reportId')
  if (typeof accepted !== 'boolean') throw new Error('accepted 必须是布尔值')

  const state = loadState()
  const index = state.reports.findIndex(report => report.id === normalizedId)
  if (index < 0 || state.reports[index].status !== CommentReportStatus.PENDING) {
    throw new Error('只有待处理的举报可以登记结果')
  }

  const report = state.reports[index]
  if (accepted) {
    await commentRepository.removeByModeration(report.commentId)
  }
  state.reports[index] = createCommentReport({
    ...report,
    status: accepted ? CommentReportStatus.ACCEPTED : CommentReportStatus.REJECTED,
    resolvedAtEpochMillis: Date.now()
  })
  saveState(state)
  return clone(state.reports[index])
}

async function findReportedCommentIds(commentIds, reporterUserId) {
  if (!Array.isArray(commentIds)) throw new Error('commentIds 必须是数组')
  if (!reporterUserId) return []

  const normalizedUserId = requireText(reporterUserId, 'reporterUserId')
  const normalizedIds = new Set(commentIds.map(commentId => (
    requireText(commentId, 'commentId')
  )))
  return [...new Set(loadState().reports
    .filter(report => (
      report.reporterUserId === normalizedUserId &&
      normalizedIds.has(report.commentId)
    ))
    .map(report => report.commentId))]
}

async function createForCurrentUser(commentId, input = {}) {
  const normalizedCommentId = requireText(commentId, 'commentId')
  const currentUser = await userRepository.findCurrent()
  if (!currentUser) throw new Error('当前用户不存在')

  const comment = await commentRepository.findById(normalizedCommentId)
  if (!comment || comment.status !== CommentStatus.VISIBLE) {
    throw new Error('评论不存在或已撤回')
  }
  if (comment.authorUserId === currentUser.id) {
    throw new Error('不能举报自己的评论')
  }

  const state = loadState()
  const duplicated = state.reports.some(report => (
    report.commentId === normalizedCommentId &&
    report.reporterUserId === currentUser.id
  ))
  if (duplicated) throw new Error('你已经举报过这条评论')

  // 先登记 PENDING，再交给可替换的审核函数处理。
  const report = createCommentReport({
    id: allocateReportId(state),
    commentId: normalizedCommentId,
    reporterUserId: currentUser.id,
    reason: input.reason,
    detail: input.detail,
    createdAtEpochMillis: Date.now()
  })
  state.reports.push(report)
  saveState(state)
  const accepted = await reviewReport(clone(report))
  return resolveReview(report.id, accepted)
}

module.exports = {
  findReportedCommentIds,
  createForCurrentUser,
  resolveReview
}
