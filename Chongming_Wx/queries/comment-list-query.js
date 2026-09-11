const commentRepository = require('../repositories/comment-repository')
const commentReportRepository = require('../repositories/comment-report-repository')
const userRepository = require('../repositories/user-repository')
const { CommentStatus, createCommentTargetRef } = require('../models/comment')
const { resolveImageUrl } = require('../utils/local-media')

function padNumber(value) {
  return String(value).padStart(2, '0')
}

function formatPublishedAt(epochMillis) {
  const date = new Date(epochMillis)
  const dateText = [
    date.getFullYear(),
    padNumber(date.getMonth() + 1),
    padNumber(date.getDate())
  ].join('-')
  const timeText = `${padNumber(date.getHours())}:${padNumber(date.getMinutes())}`
  return `${dateText} ${timeText}`
}

function createAuthorMap(users) {
  return new Map(users.filter(Boolean).map(user => [user.id, user]))
}

function createCommentItem(comment, author, viewerContext) {
  const isDeleted = comment.status === CommentStatus.DELETED
  const isRemoved = comment.status === CommentStatus.REMOVED
  if (isDeleted || isRemoved) {
    return {
      id: comment.id,
      isUnavailable: true,
      placeholderText: isDeleted
        ? (comment.rootCommentId === null ? '该评论已撤回' : '该回复已撤回')
        : (comment.rootCommentId === null
          ? '该评论因违规已被移除'
          : '该回复因违规已被移除'),
      canDelete: false
    }
  }

  const authorName = author?.displayName || '未知用户'
  const likeSummary = viewerContext.likeSummariesById.get(comment.id) || {}
  return {
    id: comment.id,
    authorUserId: comment.authorUserId,
    authorName,
    authorInitial: authorName.slice(0, 1),
    avatarUrl: resolveImageUrl(author?.avatarImageId),
    content: comment.content,
    likeCount: likeSummary.likeCount || 0,
    isLiked: Boolean(likeSummary.isLiked),
    publishedAtText: formatPublishedAt(comment.createdAtEpochMillis),
    isUnavailable: false,
    canDelete: viewerContext.currentUser?.id === comment.authorUserId,
    canReport: viewerContext.currentUser?.id !== comment.authorUserId &&
      !viewerContext.reportedCommentIds.has(comment.id)
  }
}

function createReplyReference(reply, commentsById, authorsById) {
  const parent = commentsById.get(reply.replyToCommentId)
  if (!parent || parent.rootCommentId === null) return null
  if (parent.status !== CommentStatus.VISIBLE) {
    return {
      isUnavailable: true,
      placeholderText: parent.status === CommentStatus.DELETED
        ? '原回复已撤回'
        : '原回复因违规已被移除'
    }
  }

  const parentAuthor = authorsById.get(parent.authorUserId)
  return {
    isUnavailable: false,
    authorName: parentAuthor?.displayName || '未知用户',
    content: parent.content
  }
}

function groupRepliesByRoot(replies) {
  return replies.reduce((groups, reply) => {
    const currentReplies = groups.get(reply.rootCommentId) || []
    currentReplies.push(reply)
    groups.set(reply.rootCommentId, currentReplies)
    return groups
  }, new Map())
}

// 数据关系保留完整回复链，界面只压平为“根评论 + 一层回复”。
async function findRootCommentItems(targetRef) {
  const normalizedTarget = createCommentTargetRef(targetRef)
  const comments = await commentRepository.findByTarget(normalizedTarget)
  const publicComments = comments.filter(comment => (
    comment.status === CommentStatus.VISIBLE ||
    comment.status === CommentStatus.DELETED ||
    comment.status === CommentStatus.REMOVED
  ))
  const roots = publicComments.filter(comment => comment.rootCommentId === null)
  const replies = publicComments.filter(comment => comment.rootCommentId !== null)
  const commentsById = new Map(publicComments.map(comment => [comment.id, comment]))
  const repliesByRoot = groupRepliesByRoot(replies)
  const visibleComments = publicComments.filter(comment => (
    comment.status === CommentStatus.VISIBLE
  ))
  const authorIds = [...new Set(visibleComments.map(comment => comment.authorUserId))]
  const currentUser = await userRepository.findCurrent()
  const visibleCommentIds = visibleComments.map(comment => comment.id)
  // 点赞和举报状态均批量读取，避免列表为每条评论重复访问 Storage。
  const [authors, likeSummaries, reportedCommentIds] = await Promise.all([
    Promise.all(authorIds.map(userRepository.findById)),
    commentRepository.findLikeSummaries(visibleCommentIds, currentUser?.id || ''),
    commentReportRepository.findReportedCommentIds(
      visibleCommentIds,
      currentUser?.id || ''
    )
  ])
  const authorMap = createAuthorMap(authors)
  const viewerContext = {
    currentUser,
    likeSummariesById: new Map(likeSummaries.map(summary => (
      [summary.commentId, summary]
    ))),
    reportedCommentIds: new Set(reportedCommentIds)
  }

  return roots
    .sort((left, right) => right.createdAtEpochMillis - left.createdAtEpochMillis)
    .map(comment => ({
      ...createCommentItem(comment, authorMap.get(comment.authorUserId), viewerContext),
      replies: (repliesByRoot.get(comment.id) || [])
        .sort((left, right) => left.createdAtEpochMillis - right.createdAtEpochMillis)
        .map(reply => ({
          ...createCommentItem(reply, authorMap.get(reply.authorUserId), viewerContext),
          replyReference: createReplyReference(reply, commentsById, authorMap)
        }))
    }))
}

module.exports = {
  findRootCommentItems
}
