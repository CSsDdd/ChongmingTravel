const {
  createInitialCheckpointDraftState,
  createInitialCheckpointState,
} = require('../data/seeds/checkpoint-seed')
const {
  CheckpointDraftReviewStatus,
  createCheckpoint,
  createCheckpointDraft,
  createCheckpointVersion,
} = require('../models/checkpoint')
const {
  createPublishedCheckpointDto,
} = require('../dtos/published-checkpoint-dto')
const userRepository = require('./user-repository')
// 导入初始化
const STORAGE_KEY = 'sample-checkpoints-repository-v1'
const STORAGE_DRAFT_KEY = 'sample-checkpoints-draft-repository-v1'

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

async function requireCurrentUser() {
  const currentUser = await userRepository.findCurrent()
  if (!currentUser) {
    throw new Error('请先登录后再管理打卡点草稿')
  }
  return currentUser
}

function requireOwnedCheckpoint(state, checkpointId, ownerUserId, action) {
  const checkpoint = state.checkpoints.find(item => item.id === checkpointId)
  if (!checkpoint || checkpoint.ownerUserId !== ownerUserId) {
    throw new Error(`没有找到可${action}的打卡点草稿`)
  }
  return checkpoint
}

function normalizeState(rawState, createInitialState = createInitialCheckpointState) {
  const source = rawState && Array.isArray(rawState.checkpoints) && Array.isArray(rawState.versions)
    ? rawState
    : createInitialState()
  return {
    schemaVersion: Number.isInteger(source.schemaVersion)
    && source.schemaVersion > 0
    ? source.schemaVersion
    : 1,
    nextCheckpointSequence: Number.isInteger(source.nextCheckpointSequence)
      && source.nextCheckpointSequence > 0
      ? source.nextCheckpointSequence
      : 1,
      checkpoints: source.checkpoints.map(checkpoint =>
        createCheckpoint(checkpoint)
      ),
      versions: source.versions.map(version =>
        createCheckpointVersion(version)
      ),
  }
}

function loadState() {
  return normalizeState(wx.getStorageSync(STORAGE_KEY))
}

function loadDraftState() {
  return normalizeDraftState(
    wx.getStorageSync(STORAGE_DRAFT_KEY),
    () => createInitialCheckpointDraftState(loadState())
  )
}

function saveState(state) {
  wx.setStorageSync(STORAGE_KEY, state)
}

function saveDraftState(state) {
  wx.setStorageSync(STORAGE_DRAFT_KEY, state)
}

function normalizeDraftState(rawState, createInitialState) {
  const source = rawState
    && Array.isArray(rawState.checkpoints)
    && Array.isArray(rawState.versions)
    ? rawState
    : createInitialState()
  return {
    schemaVersion: Number.isInteger(source.schemaVersion)
      && source.schemaVersion > 0
      ? source.schemaVersion
      : 1,
    nextCheckpointSequence: Number.isInteger(source.nextCheckpointSequence)
      && source.nextCheckpointSequence > 0
      ? source.nextCheckpointSequence
      : 1,
    checkpoints: source.checkpoints.map(checkpoint =>
      createCheckpoint(checkpoint)
    ),
    versions: source.versions.map(draft =>
      createCheckpointDraft(draft)
    ),
  }
}

function allocateCheckpointId(state) {
  let sequence = state.nextCheckpointSequence
  let checkpointId = ''
  do {
    checkpointId = `checkpoint-${String(sequence).padStart(6, '0')}`
    sequence += 1
  } while (state.checkpoints.some(item => item.id === checkpointId))
  state.nextCheckpointSequence = sequence
  return checkpointId
}

// 创建全新的打卡点及其第一版草稿。
async function createDraftCheckpoint(checkpointInput) {
  if (!checkpointInput || typeof checkpointInput !== 'object') {
    throw new Error('打卡点草稿数据不能为空')
  }

  const currentUser = await requireCurrentUser()
  const state = loadDraftState()
  const checkpointId = allocateCheckpointId(state)
  const checkpoint = createCheckpoint({
    id: checkpointId,
    ownerUserId: currentUser.id,
    latestVersion: 1,
    currentPublishedVersion: null,
  })
  const draftVersion = createCheckpointDraft({
    ...checkpointInput,
    checkpointId,
    ownerUserId: currentUser.id,
    version: 1,
    reviewStatus: CheckpointDraftReviewStatus.NOT_SUBMITTED,
  })

  state.checkpoints.push(checkpoint)
  state.versions.push(draftVersion)
  saveDraftState(state)
  return clone(draftVersion)
}

// 编辑指定打卡点的当前草稿；身份、版本号和发布时间不可由调用方修改。
async function editDraftCheckpoint(checkpointId, changes) {
  const normalizedCheckpointId = typeof checkpointId === 'string'
    ? checkpointId.trim()
    : ''
  if (!normalizedCheckpointId) {
    throw new Error('打卡点ID不能为空')
  }
  if (!changes || typeof changes !== 'object') {
    throw new Error('打卡点草稿修改内容不能为空')
  }

  const currentUser = await requireCurrentUser()
  const state = loadDraftState()
  const checkpoint = requireOwnedCheckpoint(
    state,
    normalizedCheckpointId,
    currentUser.id,
    '编辑'
  )

  const draftVersionIndex = state.versions.findIndex(version => (
    version.checkpointId === checkpoint.id
    && version.version === checkpoint.latestVersion
  ))
  if (draftVersionIndex < 0) {
    throw new Error('要编辑的打卡点草稿不存在')
  }

  const storedDraftVersion = state.versions[draftVersionIndex]
  if (storedDraftVersion.reviewStatus === CheckpointDraftReviewStatus.IN_REVIEW) {
    throw new Error('审核中的草稿不能修改，请先撤回审核请求')
  }
  const updatedDraftVersion = createCheckpointDraft({
    ...storedDraftVersion,
    ...changes,
    checkpointId: storedDraftVersion.checkpointId,
    ownerUserId: storedDraftVersion.ownerUserId,
    version: storedDraftVersion.version,
    reviewStatus: storedDraftVersion.reviewStatus,
  })

  state.versions[draftVersionIndex] = updatedDraftVersion
  saveDraftState(state)
  return clone(updatedDraftVersion)
}

// 统一保存入口：没有 checkpointId 时创建草稿，有 checkpointId 时编辑已有草稿。
async function update(value) {
  if (!value || typeof value !== 'object') {
    throw new Error('打卡点草稿数据不能为空')
  }

  const hasCheckpointId = Object.prototype.hasOwnProperty.call(
    value,
    'checkpointId'
  )
  if (!hasCheckpointId) {
    return createDraftCheckpoint(value)
  }

  const checkpointId = typeof value.checkpointId === 'string'
    ? value.checkpointId.trim()
    : ''
  if (!checkpointId) {
    throw new Error('打卡点ID不能为空')
  }

  const { checkpointId: ignoredCheckpointId, ...changes } = value
  return editDraftCheckpoint(checkpointId, changes)
}

// 查询所有当前草稿，每个打卡点只返回 latestVersion 指向的版本。
async function findDrafts() {
  const currentUser = await requireCurrentUser()
  const state = loadDraftState()
  const drafts = state.checkpoints
    .filter(checkpoint => checkpoint.ownerUserId === currentUser.id)
    .map(checkpoint => state.versions.find(version => (
      version.checkpointId === checkpoint.id
      && version.version === checkpoint.latestVersion
    )))
    .filter(Boolean)
  return clone(drafts)
}

// 根据打卡点 ID 查询它的当前草稿。
async function findDraft(checkpointId) {
  const normalizedCheckpointId = typeof checkpointId === 'string'
    ? checkpointId.trim()
    : ''
  if (!normalizedCheckpointId) {
    throw new Error('打卡点ID不能为空')
  }

  const currentUser = await requireCurrentUser()
  const state = loadDraftState()
  const checkpoint = state.checkpoints.find(item => (
    item.id === normalizedCheckpointId
    && item.ownerUserId === currentUser.id
  ))
  if (!checkpoint) return null

  const draft = state.versions.find(version => (
    version.checkpointId === checkpoint.id
    && version.version === checkpoint.latestVersion
  ))
  return draft ? clone(draft) : null
}

// 提交当前草稿进入审核队列。
async function submitDraftForReview(checkpointId) {
  const normalizedCheckpointId = typeof checkpointId === 'string'
    ? checkpointId.trim()
    : ''
  if (!normalizedCheckpointId) {
    throw new Error('打卡点ID不能为空')
  }

  const currentUser = await requireCurrentUser()
  const state = loadDraftState()
  const checkpoint = requireOwnedCheckpoint(
    state,
    normalizedCheckpointId,
    currentUser.id,
    '提交审核'
  )

  const draftVersionIndex = state.versions.findIndex(draft => (
    draft.checkpointId === checkpoint.id
    && draft.version === checkpoint.latestVersion
  ))
  if (draftVersionIndex < 0) {
    throw new Error('要提交审核的打卡点草稿不存在')
  }

  const storedDraft = state.versions[draftVersionIndex]
  if (storedDraft.reviewStatus === CheckpointDraftReviewStatus.IN_REVIEW) {
    throw new Error('该打卡点草稿已经在审核中')
  }

  const submittedDraft = createCheckpointDraft({
    ...storedDraft,
    reviewStatus: CheckpointDraftReviewStatus.IN_REVIEW,
  })
  state.versions[draftVersionIndex] = submittedDraft
  saveDraftState(state)
  return clone(submittedDraft)
}

// 撤回审核请求，使草稿恢复为可编辑状态。
async function withdrawDraftReview(checkpointId) {
  const normalizedCheckpointId = typeof checkpointId === 'string'
    ? checkpointId.trim()
    : ''
  if (!normalizedCheckpointId) {
    throw new Error('打卡点ID不能为空')
  }

  const currentUser = await requireCurrentUser()
  const state = loadDraftState()
  const checkpoint = requireOwnedCheckpoint(
    state,
    normalizedCheckpointId,
    currentUser.id,
    '撤回审核'
  )

  const draftVersionIndex = state.versions.findIndex(draft => (
    draft.checkpointId === checkpoint.id
    && draft.version === checkpoint.latestVersion
  ))
  if (draftVersionIndex < 0) {
    throw new Error('要撤回审核的打卡点草稿不存在')
  }

  const storedDraft = state.versions[draftVersionIndex]
  if (storedDraft.reviewStatus !== CheckpointDraftReviewStatus.IN_REVIEW) {
    throw new Error('该打卡点草稿当前不在审核中')
  }

  const withdrawnDraft = createCheckpointDraft({
    ...storedDraft,
    reviewStatus: CheckpointDraftReviewStatus.NOT_SUBMITTED,
  })
  state.versions[draftVersionIndex] = withdrawnDraft
  saveDraftState(state)
  return clone(withdrawnDraft)
}

// 删除草稿仓库中的打卡点和草稿；已经发布的正式版本不受影响。
async function deleteDraft(checkpointId) {
  const normalizedCheckpointId = typeof checkpointId === 'string'
    ? checkpointId.trim()
    : ''
  if (!normalizedCheckpointId) {
    throw new Error('打卡点ID不能为空')
  }

  const currentUser = await requireCurrentUser()
  const state = loadDraftState()
  const checkpointIndex = state.checkpoints.findIndex(item => (
    item.id === normalizedCheckpointId
    && item.ownerUserId === currentUser.id
  ))
  if (checkpointIndex < 0) {
    throw new Error('要删除的打卡点草稿不存在')
  }

  const checkpoint = state.checkpoints[checkpointIndex]
  const currentDraft = state.versions.find(draft => (
    draft.checkpointId === checkpoint.id
    && draft.version === checkpoint.latestVersion
  ))
  if (currentDraft
    && currentDraft.reviewStatus === CheckpointDraftReviewStatus.IN_REVIEW) {
    throw new Error('审核中的草稿不能删除，请先撤回审核请求')
  }

  state.checkpoints.splice(checkpointIndex, 1)
  state.versions = state.versions.filter(draft => (
    draft.checkpointId !== normalizedCheckpointId
  ))
  saveDraftState(state)
}

// LOCAL DEMO：模拟审核服务，当前固定通过。
// 接入真实审核后，审核判定应由可信的服务端/审核端完成；客户端不应直接调用
// approveDraft。届时可替换此函数，或将 approveDraft 整体迁移到服务端事务中。
async function reviewCheckpointDraft(draft) {
  return true
}

// 审核通过当前草稿：发布 Draft vN，并基于其内容生成 Draft vN+1。
async function approveDraft(checkpointId) {
  const normalizedCheckpointId = typeof checkpointId === 'string'
    ? checkpointId.trim()
    : ''
  if (!normalizedCheckpointId) {
    throw new Error('打卡点ID不能为空')
  }

  const publishedState = loadState()
  const draftState = loadDraftState()
  const draftCheckpointIndex = draftState.checkpoints.findIndex(item => (
    item.id === normalizedCheckpointId
  ))
  if (draftCheckpointIndex < 0) {
    throw new Error('要审核的打卡点不存在')
  }

  const draftCheckpoint = draftState.checkpoints[draftCheckpointIndex]
  const draftVersionIndex = draftState.versions.findIndex(draft => (
    draft.checkpointId === draftCheckpoint.id
    && draft.version === draftCheckpoint.latestVersion
  ))
  if (draftVersionIndex < 0) {
    throw new Error('要审核的打卡点草稿不存在')
  }

  const draftVersion = draftState.versions[draftVersionIndex]
  if (draftVersion.ownerUserId !== draftCheckpoint.ownerUserId) {
    throw new Error('草稿所有者信息不一致')
  }
  if (draftVersion.reviewStatus !== CheckpointDraftReviewStatus.IN_REVIEW) {
    throw new Error('只有审核中的草稿可以通过审核')
  }

  const publishedCheckpointIndex = publishedState.checkpoints.findIndex(
    item => item.id === normalizedCheckpointId
  )
  const publishedCheckpoint = publishedState.checkpoints[
    publishedCheckpointIndex
  ]
  const expectedVersion = publishedCheckpoint
    ? (publishedCheckpoint.currentPublishedVersion ?? 0) + 1
    : 1
  if (draftVersion.version !== expectedVersion) {
    throw new Error('草稿版本与当前正式版本不连续')
  }

  const duplicateVersion = publishedState.versions.some(version => (
    version.checkpointId === normalizedCheckpointId
    && version.version === draftVersion.version
  ))
  if (duplicateVersion) {
    throw new Error('该打卡点版本已经发布')
  }

  const isApproved = await reviewCheckpointDraft(clone(draftVersion))
  if (!isApproved) {
    throw new Error('打卡点草稿未通过审核')
  }

  const publishedVersion = createCheckpointVersion({
    ...draftVersion,
    publishedAtEpochMillis: Date.now(),
  })
  if (publishedCheckpoint) {
    if (publishedCheckpoint.ownerUserId !== draftCheckpoint.ownerUserId) {
      throw new Error('草稿与正式打卡点的所有者不一致')
    }
    publishedState.checkpoints[publishedCheckpointIndex] = createCheckpoint({
      ...publishedCheckpoint,
      ownerUserId: publishedCheckpoint.ownerUserId,
      latestVersion: publishedVersion.version,
      currentPublishedVersion: publishedVersion.version,
    })
  } else {
    publishedState.checkpoints.push(createCheckpoint({
      id: normalizedCheckpointId,
      ownerUserId: draftCheckpoint.ownerUserId,
      latestVersion: publishedVersion.version,
      currentPublishedVersion: publishedVersion.version,
    }))
  }
  publishedState.versions.push(publishedVersion)
  publishedState.nextCheckpointSequence = Math.max(
    publishedState.nextCheckpointSequence,
    draftState.nextCheckpointSequence
  )

  const nextDraftVersion = createCheckpointDraft({
    ...draftVersion,
    version: publishedVersion.version + 1,
    reviewStatus: CheckpointDraftReviewStatus.NOT_SUBMITTED,
  })
  draftState.checkpoints[draftCheckpointIndex] = createCheckpoint({
    ...draftCheckpoint,
    latestVersion: nextDraftVersion.version,
    currentPublishedVersion: publishedVersion.version,
  })
  draftState.versions[draftVersionIndex] = nextDraftVersion

  saveState(publishedState)
  saveDraftState(draftState)
  return clone({ publishedVersion, nextDraftVersion })
}

//重写查找所有已发布
async function findPublished() {
  const versions = loadState().checkpoints
    .map(checkpoint => loadState().versions.find(version => (
      version.checkpointId === checkpoint.id //直接对每个checkpoint找最新发布版本，先检查是否正确
      && version.version === checkpoint.currentPublishedVersion //找最新发布版本
    )))
    .filter(Boolean)
  return clone(versions)
}

async function findVersion(checkpointId, version) {
  const checkpoint = loadState().versions.find(item => (
    item.checkpointId === checkpointId && item.version === version
  ))
  return checkpoint ? clone(checkpoint) : null
}

async function getPublishedCheckpointDTOs() {
  const state = loadState()
  const results = state.checkpoints.map(checkpoint => {
    const version = state.versions.find(item => (
      item.checkpointId === checkpoint.id
      && item.version === checkpoint.currentPublishedVersion
    ))
    return version ? createPublishedCheckpointDto(checkpoint, version) : null
  }).filter(Boolean)
  return clone(results)
}

async function getPublishedCheckpointDTO(checkpointId, version) {
  const state = loadState()
  const checkpoint = state.checkpoints.find(item => item.id === checkpointId)
  const checkpointVersion = state.versions.find(item => (
    item.checkpointId === checkpointId && item.version === version
  ))
  if (!checkpoint || !checkpointVersion) {
    return null
  }
  return clone(createPublishedCheckpointDto(checkpoint, checkpointVersion))
}

async function incrementViewCount(checkpointId) {
  const state = loadState()
  const checkpointIndex = state.checkpoints.findIndex(item => (
    item.id === checkpointId
  ))
  if (checkpointIndex < 0) {
    throw new Error('要记录浏览量的公开打卡点不存在')
  }
  const checkpoint = createCheckpoint({
    ...state.checkpoints[checkpointIndex],
    viewCount: state.checkpoints[checkpointIndex].viewCount + 1,
  })
  state.checkpoints[checkpointIndex] = checkpoint
  saveState(state)
  return checkpoint.viewCount
}

async function incrementShareCount(checkpointId) {
  const state = loadState()
  const checkpointIndex = state.checkpoints.findIndex(item => (
    item.id === checkpointId
  ))
  if (checkpointIndex < 0) {
    throw new Error('要记录转发量的公开打卡点不存在')
  }
  const checkpoint = createCheckpoint({
    ...state.checkpoints[checkpointIndex],
    shareCount: state.checkpoints[checkpointIndex].shareCount + 1,
  })
  state.checkpoints[checkpointIndex] = checkpoint
  saveState(state)
  return checkpoint.shareCount
}

/**
 * @param {{ text?: string }} query //简单声明query，字段可添加
 */

// 在公开范围内查找
async function searchPublished(query = {}) {
  let results = await findPublished()//先获取全部备选（公开范围）
  return filterPublishedByText(results, query)
}

function filterPublishedByText(results, query) {
  const text = String(query.text ?? '')//文本规范化
    .normalize('NFKC')
    .trim()
    .toLowerCase()

  if (text) {
    results = results.filter(checkpoint => {
      const searchableFields = [
        checkpoint.title,
        checkpoint.location.locationName,
        checkpoint.shortText,
        ...checkpoint.tagIds,
      ]

      return searchableFields.some(field =>
        String(field)
          .normalize('NFKC')
          .toLowerCase()
          .includes(text)
      )
    })
  }

  return results
}

async function searchPublishedCheckpointDTOs(query = {}) {
  const results = await getPublishedCheckpointDTOs()
  return filterPublishedByText(results, query)
}

module.exports = {
  approveDraft,
  deleteDraft,
  findDraft,
  findDrafts,
  findPublished,
  findVersion,
  getPublishedCheckpointDTO,
  getPublishedCheckpointDTOs,
  incrementShareCount,
  incrementViewCount,
  searchPublished,
  searchPublishedCheckpointDTOs,
  submitDraftForReview,
  update,
  withdrawDraftReview,
}
