const { createUserProfile } = require('../../models/user-profile')
const profileOptionRepository = require('../../repositories/profile-option-repository')
const userRepository = require('../../repositories/user-repository')
const userProfileRepository = require('../../repositories/user-profile-repository')

const MAX_TAGS = 6
const MAX_TAG_LENGTH = 12

const TAG_FIELDS = {
  skill: {
    tags: 'skillTags',
    input: 'skillInput',
    suggestions: 'suggestedSkillTags',
    available: 'availableSkillTags',
  },
  interest: {
    tags: 'interestTags',
    input: 'interestInput',
    suggestions: 'suggestedInterestTags',
    available: 'availableInterestTags',
  },
}

function availableTags(suggestions, selectedTags) {
  return suggestions.filter(tag => !selectedTags.includes(tag))
}

function createProfileDraft(data) {
  const ageGroup = data.ageGroups[data.ageIndex]
  return {
    ageGroup: ageGroup ? ageGroup.value : '',
    skillTags: data.skillTags,
    interestTags: data.interestTags,
    bio: data.bio,
  }
}

Page({
  data: {
    userId: '',
    ageGroups: [],
    ageIndex: 0,
    skillTags: [],
    interestTags: [],
    suggestedSkillTags: [],
    suggestedInterestTags: [],
    availableSkillTags: [],
    availableInterestTags: [],
    skillInput: '',
    interestInput: '',
    bio: '',
    isLoaded: false,
    isSaving: false,
  },

  async onLoad() {
    const currentUser = await userRepository.findCurrent()
    if (!currentUser) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      wx.navigateBack()
      return
    }

    const storedProfile = await userProfileRepository.findByUserId(currentUser.id)
    const profile = storedProfile || createUserProfile({ userId: currentUser.id })
    const [ageGroups, suggestedSkillTags, suggestedInterestTags] = await Promise.all([
      profileOptionRepository.findAgeGroups(),
      profileOptionRepository.findSuggestedSkillTags({
        limit: 5,
        exclude: profile.skillTags,
      }),
      profileOptionRepository.findSuggestedInterestTags({
        limit: 5,
        exclude: profile.interestTags,
      }),
    ])
    const ageIndex = Math.max(
      ageGroups.findIndex(item => item.value === profile.ageGroup),
      0
    )
    this.setData({
      userId: currentUser.id,
      ageGroups,
      ageIndex,
      skillTags: profile.skillTags,
      interestTags: profile.interestTags,
      suggestedSkillTags,
      suggestedInterestTags,
      availableSkillTags: availableTags(suggestedSkillTags, profile.skillTags),
      availableInterestTags: availableTags(
        suggestedInterestTags,
        profile.interestTags
      ),
      bio: profile.bio,
      isLoaded: true,
    }, () => {
      this.rememberInitialDraft()
    })
  },

  onAgeChange(e) {
    this.setData({ ageIndex: Number(e.detail.value) }, () => {
      this.updateUnsavedWarning()
    })
  },

  onTagInput(e) {
    const { kind } = e.currentTarget.dataset
    const fields = TAG_FIELDS[kind]
    this.setData({ [fields.input]: e.detail.value })
  },

  addSuggestedTag(e) {
    const { kind, tag } = e.currentTarget.dataset
    this.addTag(kind, tag)
  },

  addCustomTag(e) {
    const { kind } = e.currentTarget.dataset
    const fields = TAG_FIELDS[kind]
    if (this.addTag(kind, this.data[fields.input])) {
      this.setData({ [fields.input]: '' })
    }
  },

  addTag(kind, rawTag) {
    const fields = TAG_FIELDS[kind]
    const tag = typeof rawTag === 'string' ? rawTag.trim() : ''
    const selectedTags = this.data[fields.tags]
    if (!tag || selectedTags.includes(tag)) {
      return false
    }
    if (tag.length > MAX_TAG_LENGTH) {
      wx.showToast({ title: `标签最多${MAX_TAG_LENGTH}个字`, icon: 'none' })
      return false
    }
    if (selectedTags.length >= MAX_TAGS) {
      wx.showToast({ title: `每类最多${MAX_TAGS}个标签`, icon: 'none' })
      return false
    }

    const nextTags = [...selectedTags, tag]
    const suggestions = this.data[fields.suggestions]
    this.setData({
      [fields.tags]: nextTags,
      [fields.available]: availableTags(suggestions, nextTags),
    }, () => {
      this.updateUnsavedWarning()
    })
    return true
  },

  removeTag(e) {
    const { kind, tag } = e.currentTarget.dataset
    const fields = TAG_FIELDS[kind]
    const nextTags = this.data[fields.tags].filter(item => item !== tag)
    const suggestions = this.data[fields.suggestions]
    this.setData({
      [fields.tags]: nextTags,
      [fields.available]: availableTags(suggestions, nextTags),
    }, () => {
      this.updateUnsavedWarning()
    })
  },

  onBioInput(e) {
    this.setData({ bio: e.detail.value }, () => {
      this.updateUnsavedWarning()
    })
  },

  rememberInitialDraft() {
    this.initialDraft = JSON.stringify(createProfileDraft(this.data))
    this.hasUnsavedChanges = false
  },

  updateUnsavedWarning() {
    const currentDraft = JSON.stringify(createProfileDraft(this.data))
    const hasChanges = currentDraft !== this.initialDraft
    if (hasChanges === this.hasUnsavedChanges) {
      return
    }

    this.hasUnsavedChanges = hasChanges
    if (hasChanges) {
      wx.enableAlertBeforeUnload({ message: '修改尚未保存，确定离开吗？' })
      return
    }
    wx.disableAlertBeforeUnload()
  },

  disableUnsavedWarning() {
    this.hasUnsavedChanges = false
    wx.disableAlertBeforeUnload()
  },

  async saveProfile() {
    if (this.data.isSaving) {
      return
    }
    this.setData({ isSaving: true })

    try {
      await userProfileRepository.save({
        userId: this.data.userId,
        ageGroup: this.data.ageGroups[this.data.ageIndex].value,
        skillTags: this.data.skillTags,
        interestTags: this.data.interestTags,
        bio: this.data.bio,
      })
      this.setData({ isSaving: false })
      this.disableUnsavedWarning()
      wx.showToast({ title: '保存成功', icon: 'success' })
      wx.navigateBack()
    } catch (error) {
      this.setData({ isSaving: false })
      wx.showToast({ title: error.message || '保存失败', icon: 'none' })
    }
  },
})
