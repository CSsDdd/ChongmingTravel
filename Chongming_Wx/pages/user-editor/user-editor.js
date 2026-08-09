const userRepository = require('../../repositories/user-repository')

function createBasicInfoDraft(data) {
  return {
    displayName: data.displayName,
    avatarImageId: data.avatarImageId,
  }
}

Page({
  data: {
    userId: '',
    displayName: '',
    avatarImageId: '',
    requiresLogin: false,
    isLoaded: false,
    isSaving: false,
  },

  async onLoad() {
    const currentUser = await userRepository.findCurrent()
    if (!currentUser) {
      this.setData({ requiresLogin: true })
      return
    }

    this.setData({
      userId: currentUser.id,
      displayName: currentUser.displayName,
      avatarImageId: currentUser.avatarImageId,
      isLoaded: true,
    }, () => {
      this.rememberInitialDraft()
    })
  },

  onChooseAvatar(e) {
    this.setData({ avatarImageId: e.detail.avatarUrl }, () => {
      this.updateUnsavedWarning()
    })
  },

  onDisplayNameInput(e) {
    this.setData({ displayName: e.detail.value }, () => {
      this.updateUnsavedWarning()
    })
  },

  rememberInitialDraft() {
    this.initialDraft = JSON.stringify(createBasicInfoDraft(this.data))
    this.hasUnsavedChanges = false
  },

  updateUnsavedWarning() {
    const currentDraft = JSON.stringify(createBasicInfoDraft(this.data))
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

  goToLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  },

  async saveBasicInfo() {
    if (this.data.isSaving) {
      return
    }
    if (!this.data.displayName.trim()) {
      wx.showToast({ title: '用户名不能为空', icon: 'none' })
      return
    }
    this.setData({ isSaving: true })

    try {
      const user = await userRepository.updateBasicInfo(this.data.userId, {
        displayName: this.data.displayName,
        avatarImageId: this.data.avatarImageId,
      })
      getApp().globalData.currentUser = user
      this.setData({ isSaving: false })
      this.disableUnsavedWarning()
      wx.showToast({ title: '保存成功', icon: 'success' })
      wx.navigateBack()
    } catch (error) {
      this.setData({ isSaving: false })
      wx.showToast({ title: error.message || '保存失败', icon: 'none' })
    }
  },

  async logout() {
    const result = await wx.showModal({
      title: '退出登录',
      content: '退出后仍会保留用户数据。',
      confirmText: '退出',
      confirmColor: '#b5443b',
    })
    if (!result.confirm) {
      return
    }

    await userRepository.logout()
    getApp().globalData.currentUser = null
    this.disableUnsavedWarning()
    wx.reLaunch({ url: '/pages/discovery/discovery' })
  },
})
