const sampleUserState = require('../data/sample-users')
const { createUser } = require('../models/user')

const STORAGE_KEY = 'sample-user-repository-v1'
const CURRENT_USER_ID_KEY = 'sample-current-user-id'

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function normalizeLoginName(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function loadState() {
  const storedState = wx.getStorageSync(STORAGE_KEY)
  if (storedState && Array.isArray(storedState.users)
    && Array.isArray(storedState.identities)) {
    return storedState
  }
  return clone(sampleUserState)
}

function saveState(state) {
  wx.setStorageSync(STORAGE_KEY, state)
}

function allocateUserId(state) {
  const sequence = Number.isInteger(state.nextUserSequence)
    ? state.nextUserSequence
    : 1
  state.nextUserSequence = sequence + 1
  return `user-${String(sequence).padStart(6, '0')}`
}

async function findById(userId) {
  const user = loadState().users.find(item => item.id === userId)
  return user ? clone(user) : null
}

async function findAll() {
  return clone(loadState().users)
}

async function loginByName({ loginName, displayName, avatarImageId }) {
  const externalUserId = normalizeLoginName(loginName)
  if (!externalUserId) {
    throw new Error('登录名不能为空')
  }

  const state = loadState()
  const identity = state.identities.find(item => (
    item.provider === 'sample'
      && item.externalUserId === externalUserId
  ))

  if (identity) {
    const userIndex = state.users.findIndex(item => item.id === identity.userId)
    const user = state.users[userIndex]
    if (!user) {
      throw new Error('登录身份对应的用户不存在')
    }

    const updatedUser = createUser({
      ...user,
      displayName: displayName || user.displayName,
      avatarImageId: avatarImageId || user.avatarImageId,
      updatedAtEpochMillis: Date.now(),
    })
    state.users[userIndex] = updatedUser
    saveState(state)
    wx.setStorageSync(CURRENT_USER_ID_KEY, updatedUser.id)
    return clone(updatedUser)
  }

  const user = createUser({
    id: allocateUserId(state),
    displayName: displayName || loginName,
    avatarImageId,
  })
  state.users.push(user)
  state.identities.push({
    provider: 'sample',
    externalUserId,
    userId: user.id,
  })
  saveState(state)
  wx.setStorageSync(CURRENT_USER_ID_KEY, user.id)
  return clone(user)
}

async function findCurrent() {
  const userId = wx.getStorageSync(CURRENT_USER_ID_KEY)
  return userId ? findById(userId) : null
}

module.exports = {
  findAll,
  findById,
  findCurrent,
  loginByName,
}
