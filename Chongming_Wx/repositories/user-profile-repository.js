const {
  createInitialUserProfiles,
} = require('../data/seeds/user-profile-seed')
const { createUserProfile } = require('../models/user-profile')
const userRepository = require('./user-repository')

const STORAGE_KEY = 'sample-user-profile-repository-v1'

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function loadProfiles() {
  const storedProfiles = wx.getStorageSync(STORAGE_KEY)
  return Array.isArray(storedProfiles)
    ? storedProfiles
    : createInitialUserProfiles()
}

function saveProfiles(profiles) {
  wx.setStorageSync(STORAGE_KEY, profiles)
}

async function findByUserId(userId) {
  const profile = loadProfiles().find(item => item.userId === userId)
  return profile ? createUserProfile(profile) : null
}

async function save(profileInput) {
  const user = await userRepository.findById(profileInput.userId)
  if (!user) {
    throw new Error('无法为不存在的用户保存个人资料')
  }

  const profile = createUserProfile({
    ...profileInput,
    updatedAtEpochMillis: Date.now(),
  })
  const profiles = loadProfiles()
  const index = profiles.findIndex(item => item.userId === profile.userId)

  if (index >= 0) {
    profiles[index] = profile
  } else {
    profiles.push(profile)
  }
  saveProfiles(profiles)
  return clone(profile)
}

module.exports = {
  findByUserId,
  save,
}
