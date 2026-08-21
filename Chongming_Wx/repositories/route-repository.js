//seed 初始状态生成
const {
  RouteDraftReviewStatus,
  createRoute,
  createRouteVersion,
  createRouteDraft,
} = require('../models/route')
const {
  createInitialRouteDraftState,
  createInitialRouteState,
} = require('../data/seeds/route-seed')
const {
  createPublishedRouteDto,
} = require('../dtos/published-route-dto')
const userRepository = require('./user-repository')
// 导入初始化
const STORAGE_KEY = 'sample-routes-repository-v1'
const STORAGE_DRAFT_KEY = 'sample-routes-draft-repository-v1'

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

async function requireCurrentUser() {
  const currentUser = await userRepository.findCurrent()
  if (!currentUser) {
    throw new Error('请先登录后再管理路线草稿')
  }
  return currentUser
}

function requireOwnedRoute(state, routeId, ownerUserId, action) {
  const route = state.routes.find(item => item.id === routeId)
  if (!route || route.ownerUserId !== ownerUserId) {
    throw new Error(`没有找到可${action}的路线`)
  }
  return route
}

function normalizeState(rawState, createInitialState = createInitialRouteState) {
  const source = rawState && Array.isArray(rawState.routes) && Array.isArray(rawState.versions)
    ? rawState
    : createInitialState()
  return {
    schemaVersion: Number.isInteger(source.schemaVersion)
    && source.schemaVersion > 0
    ? source.schemaVersion
    : 1,
    nextRouteSequence: Number.isInteger(source.nextRouteSequence)
      && source.nextRouteSequence > 0
      ? source.nextRouteSequence
      : 1,
    routes: source.routes.map(route =>
        createRoute(route)
      ),
    versions: source.versions.map(version =>
        createRouteVersion(version)
      ),
  }
}

function loadState() {
  return normalizeState(
    wx.getStorageSync(STORAGE_KEY),
    createInitialRouteState
  )
}

function loadDraftState() {
  return normalizeDraftState(
    wx.getStorageSync(STORAGE_DRAFT_KEY),
    () => createInitialRouteDraftState(loadState())
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
    && Array.isArray(rawState.routes)
    && Array.isArray(rawState.versions)
    ? rawState
    : createInitialState()
  return {
    schemaVersion: Number.isInteger(source.schemaVersion)
      && source.schemaVersion > 0
      ? source.schemaVersion
      : 1,
    nextRouteSequence: Number.isInteger(source.nextRouteSequence)
      && source.nextRouteSequence > 0
      ? source.nextRouteSequence
      : 1,
    routes: source.routes.map(route =>
      createRoute(route)
    ),
    versions: source.versions.map(draft =>
      createRouteDraft(draft)
    ),
  }
}

function allocateRouteId(state) {
  let sequence = state.nextRouteSequence
  let routeId = ''
  do {
    routeId = `route-${String(sequence).padStart(6, '0')}`
    sequence += 1
  } while (state.routes.some(item => item.id === routeId))
  state.nextRouteSequence = sequence
  return routeId
}

// 创建全新的路线及其第一版草稿。
async function createDraftRoute(routeInput) {
  if (!routeInput || typeof routeInput !== 'object') {
    throw new Error('路线草稿数据不能为空')
  }

  const currentUser = await requireCurrentUser()
  const state = loadDraftState()
  const routeId = allocateRouteId(state)
  const route = createRoute({
    id: routeId,
    ownerUserId: currentUser.id,
    sourceRouteRef: null,
    latestVersion: 1,
    currentPublishedVersion: null,
  })
  const draftVersion = createRouteDraft({
    ...routeInput,
    routeId,
    ownerUserId: currentUser.id,
    version: 1,
    reviewStatus: RouteDraftReviewStatus.NOT_SUBMITTED,
  })

  state.routes.push(route)
  state.versions.push(draftVersion)
  saveDraftState(state)
  return clone(draftVersion)
}

// 从公开版本派生新的路线身份及其 Version 1 草稿。
async function createDerivedDraftRoute(sourceRouteRef) {
  if (!sourceRouteRef || typeof sourceRouteRef !== 'object') {
    throw new Error('来源路线引用不能为空')
  }

  const sourceRouteId = typeof sourceRouteRef.routeId === 'string'
    ? sourceRouteRef.routeId.trim()
    : ''
  const sourceVersionNumber = sourceRouteRef.version
  if (!sourceRouteId
    || !Number.isInteger(sourceVersionNumber)
    || sourceVersionNumber < 1) {
    throw new Error('来源路线引用格式不正确')
  }

  const currentUser = await requireCurrentUser()
  const publishedState = loadState()
  const sourceRoute = publishedState.routes.find(route => (
    route.id === sourceRouteId
  ))
  const sourceVersion = publishedState.versions.find(version => (
    version.routeId === sourceRouteId
    && version.version === sourceVersionNumber
  ))
  if (!sourceRoute || !sourceVersion) {
    throw new Error('没有找到可复制的公开路线版本')
  }

  const draftState = loadDraftState()
  const routeId = allocateRouteId(draftState)
  const now = Date.now()
  const route = createRoute({
    id: routeId,
    ownerUserId: currentUser.id,
    sourceRouteRef: {
      routeId: sourceRouteId,
      version: sourceVersionNumber,
    },
    latestVersion: 1,
    currentPublishedVersion: null,
    createdAtEpochMillis: now,
  })
  const draftVersion = createRouteDraft({
    ...sourceVersion,
    routeId,
    ownerUserId: currentUser.id,
    version: 1,
    reviewStatus: RouteDraftReviewStatus.NOT_SUBMITTED,
    createdAtEpochMillis: now,
    updatedAtEpochMillis: now,
  })

  draftState.routes.push(route)
  draftState.versions.push(draftVersion)
  saveDraftState(draftState)
  return clone(draftVersion)
}

// 编辑指定路线的当前草稿；身份、版本号和发布时间不可由调用方修改。
async function editDraftRoute(routeId, changes) {
  const normalizedRouteId = typeof routeId === 'string'
    ? routeId.trim()
    : ''
  if (!normalizedRouteId) {
    throw new Error('路线ID不能为空')
  }
  if (!changes || typeof changes !== 'object') {
    throw new Error('路径草稿修改内容不能为空')
  }

  const currentUser = await requireCurrentUser()
  const state = loadDraftState()
  const route = requireOwnedRoute(
    state,
    normalizedRouteId,
    currentUser.id,
    '编辑'
  )

  const draftVersionIndex = state.versions.findIndex(version => (
    version.routeId === route.id
    && version.version === route.latestVersion
  ))
  if (draftVersionIndex < 0) {
    throw new Error('要编辑的路线草稿不存在')
  }

  const storedDraftVersion = state.versions[draftVersionIndex]
  if (storedDraftVersion.reviewStatus === RouteDraftReviewStatus.IN_REVIEW) {
    throw new Error('审核中的草稿不能修改，请先撤回审核请求')
  }
  const updatedDraftVersion = createRouteDraft({
    ...storedDraftVersion,
    ...changes,
    routeId: storedDraftVersion.routeId,
    ownerUserId: storedDraftVersion.ownerUserId,
    version: storedDraftVersion.version,
    reviewStatus: storedDraftVersion.reviewStatus,
    updatedAtEpochMillis: Date.now(),
  })

  state.versions[draftVersionIndex] = updatedDraftVersion
  saveDraftState(state)
  return clone(updatedDraftVersion)
}

// 统一保存入口：没有 routeId 时创建草稿，有 routeId 时编辑已有草稿。
async function update(value) {
  if (!value || typeof value !== 'object') {
    throw new Error('路线草稿数据不能为空')
  }

  const hasRouteId = Object.prototype.hasOwnProperty.call(
    value,
    'routeId'
  )
  if (!hasRouteId) {
    return createDraftRoute(value)
  }

  const routeId = typeof value.routeId === 'string'
    ? value.routeId.trim()
    : ''
  if (!routeId) {
    throw new Error('路线ID不能为空')
  }

  const { routeId: ignoredRouteId, ...changes } = value
  return editDraftRoute(routeId, changes)
}

// 查询所有当前草稿，每条路线只返回 latestVersion 指向的版本。
async function findDrafts() {
  const currentUser = await requireCurrentUser()
  const state = loadDraftState()
  const drafts = state.routes
    .filter(route => route.ownerUserId === currentUser.id)
    .map(route => state.versions.find(version => (
      version.routeId === route.id
      && version.version === route.latestVersion
    )))
    .filter(Boolean)
  return clone(drafts)
}

// 根据路线 ID 查询它的当前草稿。
async function findDraft(routeId) {
  const normalizedRouteId = typeof routeId === 'string'
    ? routeId.trim()
    : ''
  if (!normalizedRouteId) {
    throw new Error('路线ID不能为空')
  }

  const currentUser = await requireCurrentUser()
  const state = loadDraftState()
  const route = state.routes.find(item => (
    item.id === normalizedRouteId
    && item.ownerUserId === currentUser.id
  ))
  if (!route) return null

  const draft = state.versions.find(version => (
    version.routeId === route.id
    && version.version === route.latestVersion
  ))
  return draft ? clone(draft) : null
}

// 提交当前草稿进入审核队列。
async function submitDraftForReview(routeId) {
  const normalizedRouteId = typeof routeId === 'string'
    ? routeId.trim()
    : ''
  if (!normalizedRouteId) {
    throw new Error('路线ID不能为空')
  }

  const currentUser = await requireCurrentUser()
  const state = loadDraftState()
  const route = requireOwnedRoute(
    state,
    normalizedRouteId,
    currentUser.id,
    '提交审核'
  )

  const draftVersionIndex = state.versions.findIndex(draft => (
    draft.routeId === route.id
    && draft.version === route.latestVersion
  ))
  if (draftVersionIndex < 0) {
    throw new Error('要提交审核的路线草稿不存在')
  }

  const storedDraft = state.versions[draftVersionIndex]
  if (storedDraft.reviewStatus === RouteDraftReviewStatus.IN_REVIEW) {
    throw new Error('该路线草稿已经在审核中')
  }
  if (storedDraft.stops.length < 2) {
    throw new Error('路线至少需要两个打卡点才能提交审核')
  }

  const submittedDraft = createRouteDraft({
    ...storedDraft,
    reviewStatus: RouteDraftReviewStatus.IN_REVIEW,
  })
  state.versions[draftVersionIndex] = submittedDraft
  saveDraftState(state)
  return clone(submittedDraft)
}

// 撤回审核请求，使草稿恢复为可编辑状态。
async function withdrawDraftReview(routeId) {
  const normalizedRouteId = typeof routeId === 'string'
    ? routeId.trim()
    : ''
  if (!normalizedRouteId) {
    throw new Error('路线ID不能为空')
  }

  const currentUser = await requireCurrentUser()
  const state = loadDraftState()
  const route = requireOwnedRoute(
    state,
    normalizedRouteId,
    currentUser.id,
    '撤回审核'
  )

  const draftVersionIndex = state.versions.findIndex(draft => (
    draft.routeId === route.id
    && draft.version === route.latestVersion
  ))
  if (draftVersionIndex < 0) {
    throw new Error('要撤回审核的路线草稿不存在')
  }

  const storedDraft = state.versions[draftVersionIndex]
  if (storedDraft.reviewStatus !== RouteDraftReviewStatus.IN_REVIEW) {
    throw new Error('该路线草稿当前不在审核中')
  }

  const withdrawnDraft = createRouteDraft({
    ...storedDraft,
    reviewStatus: RouteDraftReviewStatus.NOT_SUBMITTED,
  })
  state.versions[draftVersionIndex] = withdrawnDraft
  saveDraftState(state)
  return clone(withdrawnDraft)
}

// 删除草稿仓库中的路线和草稿；已经发布的正式版本不受影响。
async function deleteDraft(routeId) {
  const normalizedRouteId = typeof routeId === 'string'
    ? routeId.trim()
    : ''
  if (!normalizedRouteId) {
    throw new Error('路线ID不能为空')
  }

  const currentUser = await requireCurrentUser()
  const state = loadDraftState()
  const routeIndex = state.routes.findIndex(item => (
    item.id === normalizedRouteId
    && item.ownerUserId === currentUser.id
  ))
  if (routeIndex < 0) {
    throw new Error('要删除的路线草稿不存在')
  }

  const route = state.routes[routeIndex]
  const currentDraft = state.versions.find(draft => (
    draft.routeId === route.id
    && draft.version === route.latestVersion
  ))
  if (currentDraft
    && currentDraft.reviewStatus === RouteDraftReviewStatus.IN_REVIEW) {
    throw new Error('审核中的草稿不能删除，请先撤回审核请求')
  }

  state.routes.splice(routeIndex, 1)
  state.versions = state.versions.filter(draft => (
    draft.routeId !== normalizedRouteId
  ))
  saveDraftState(state)
}

// LOCAL DEMO：模拟审核服务，当前固定通过。
// 接入真实审核后，审核判定应由可信的服务端/审核端完成；客户端不应直接调用
// approveDraft。届时可替换此函数，或将 approveDraft 整体迁移到服务端事务中。
async function reviewRouteDraft(draft) {
  return true
}

// 审核通过当前草稿：发布 Draft vN，并基于其内容生成 Draft vN+1。
async function approveDraft(routeId) {
  const normalizedRouteId = typeof routeId === 'string'
    ? routeId.trim()
    : ''
  if (!normalizedRouteId) {
    throw new Error('路线ID不能为空')
  }

  const publishedState = loadState()
  const draftState = loadDraftState()
  const draftRouteIndex = draftState.routes.findIndex(item => (
    item.id === normalizedRouteId
  ))
  if (draftRouteIndex < 0) {
    throw new Error('要审核的路线不存在')
  }

  const draftRoute = draftState.routes[draftRouteIndex]
  const draftVersionIndex = draftState.versions.findIndex(draft => (
    draft.routeId === draftRoute.id
    && draft.version === draftRoute.latestVersion
  ))
  if (draftVersionIndex < 0) {
    throw new Error('要审核的路线草稿不存在')
  }

  const draftVersion = draftState.versions[draftVersionIndex]
  if (draftVersion.ownerUserId !== draftRoute.ownerUserId) {
    throw new Error('草稿所有者信息不一致')
  }
  if (draftVersion.reviewStatus !== RouteDraftReviewStatus.IN_REVIEW) {
    throw new Error('只有审核中的草稿可以通过审核')
  }

  const publishedRouteIndex = publishedState.routes.findIndex(
    item => item.id === normalizedRouteId
  )
  const publishedRoute = publishedState.routes[
    publishedRouteIndex
  ]
  const expectedVersion = publishedRoute
    ? (publishedRoute.currentPublishedVersion ?? 0) + 1
    : 1
  if (draftVersion.version !== expectedVersion) {
    throw new Error('草稿版本与当前正式版本不连续')
  }

  const duplicateVersion = publishedState.versions.some(version => (
    version.routeId === normalizedRouteId
    && version.version === draftVersion.version
  ))
  if (duplicateVersion) {
    throw new Error('该路线版本已经发布')
  }

  const isApproved = await reviewRouteDraft(clone(draftVersion))
  if (!isApproved) {
    throw new Error('路线草稿未通过审核')
  }

  const publishedVersion = createRouteVersion({
    ...draftVersion,
    publishedAtEpochMillis: Date.now(),
  })
  if (publishedRoute) {
    if (publishedRoute.ownerUserId !== draftRoute.ownerUserId) {
      throw new Error('草稿与正式路线的所有者不一致')
    }
    publishedState.routes[publishedRouteIndex] = createRoute({
      ...publishedRoute,
      ownerUserId: publishedRoute.ownerUserId,
      latestVersion: publishedVersion.version,
      currentPublishedVersion: publishedVersion.version,
    })
  } else {
    publishedState.routes.push(createRoute({
      ...draftRoute,
      id: normalizedRouteId,
      ownerUserId: draftRoute.ownerUserId,
      latestVersion: publishedVersion.version,
      currentPublishedVersion: publishedVersion.version,
    }))
  }
  publishedState.versions.push(publishedVersion)
  publishedState.nextRouteSequence = Math.max(
    publishedState.nextRouteSequence,
    draftState.nextRouteSequence
  )

  const now = Date.now()
  const nextDraftVersion = createRouteDraft({
    ...draftVersion,
    version: publishedVersion.version + 1,
    reviewStatus: RouteDraftReviewStatus.NOT_SUBMITTED,
    createdAtEpochMillis: now,
    updatedAtEpochMillis: now,
  })
  draftState.routes[draftRouteIndex] = createRoute({
    ...draftRoute,
    latestVersion: nextDraftVersion.version,
    currentPublishedVersion: publishedVersion.version,
  })
  draftState.versions[draftVersionIndex] = nextDraftVersion

  saveState(publishedState)
  saveDraftState(draftState)
  return clone({ publishedVersion, nextDraftVersion })
}

// 查询所有路线当前指向的公开 RouteVersion。
async function findPublished() {
  const state = loadState()
  const versions = state.routes
    .map(route => state.versions.find(version => (
      version.routeId === route.id
      && version.version === route.currentPublishedVersion
    )))
    .filter(Boolean)
  return clone(versions)
}

async function findVersion(routeId, version) {
  const routeVersion = loadState().versions.find(item => (
    item.routeId === routeId
    && item.version === version
  ))
  return routeVersion ? clone(routeVersion) : null
}

async function getPublishedRouteDTOs() {
  const state = loadState()
  const results = state.routes.map(route => {
    const version = state.versions.find(item => (
      item.routeId === route.id
      && item.version === route.currentPublishedVersion
    ))
    return version ? createPublishedRouteDto(route, version) : null
  }).filter(Boolean)
  return clone(results)
}

async function getPublishedRouteDTO(routeId, version) {
  const state = loadState()
  const route = state.routes.find(item => item.id === routeId)
  const routeVersion = state.versions.find(item => (
    item.routeId === routeId
    && item.version === version
  ))
  if (!route || !routeVersion) {
    return null
  }
  return clone(createPublishedRouteDto(route, routeVersion))
}

function filterPublishedByText(results, query) {
  const text = String(query.text ?? '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
  if (!text) {
    return results
  }

  return results.filter(route => {
    const searchableFields = [
      route.title,
      route.description,
      route.note,
      ...route.tagIds,
      ...route.stops.map(stop => stop.note),
    ]
    return searchableFields.some(field => String(field)
      .normalize('NFKC')
      .toLowerCase()
      .includes(text))
  })
}

// 在公开范围内查找
async function searchPublished(query = {}) {
  return filterPublishedByText(await findPublished(), query)
}

async function searchPublishedRouteDTOs(query = {}) {
  return filterPublishedByText(await getPublishedRouteDTOs(), query)
}

module.exports = {
  approveDraft,
  createDerivedDraftRoute,
  deleteDraft,
  findDraft,
  findDrafts,
  findPublished,
  findVersion,
  getPublishedRouteDTO,
  getPublishedRouteDTOs,
  searchPublished,
  searchPublishedRouteDTOs,
  submitDraftForReview,
  update,
  withdrawDraftReview,
}
