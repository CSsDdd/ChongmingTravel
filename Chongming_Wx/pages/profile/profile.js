const userRepository = require('../../repositories/user-repository')
const userProfileRepository = require('../../repositories/user-profile-repository')

const AGE_GROUP_LABELS = {
  UNDER_12: '12岁以下',
  AGE_12_TO_15: '12至15岁',
  AGE_16_TO_18: '16至18岁',
  ADULT: '成年人',
  UNDISCLOSED: '未填写',
}

Page({
  data: {
    currentUser: null,
    userProfile: null,
    ageGroupLabel: '未填写',
    skillText: '未填写',
    interestText: '未填写',
    bioText: '未填写',
    hasLoadedCurrentUser: false,
  },

  async onShow() {
    const currentUser = await userRepository.findCurrent()
    const userProfile = currentUser
      ? await userProfileRepository.findByUserId(currentUser.id)
      : null
    this.setData({
      currentUser,
      userProfile,
      ageGroupLabel: userProfile
        ? AGE_GROUP_LABELS[userProfile.ageGroup] || '未填写'
        : '未填写',
      skillText: userProfile && userProfile.skillTags.length
        ? userProfile.skillTags.join('、')
        : '未填写',
      interestText: userProfile && userProfile.interestTags.length
        ? userProfile.interestTags.join('、')
        : '未填写',
      bioText: userProfile && userProfile.bio
        ? userProfile.bio
        : '未填写',
      hasLoadedCurrentUser: true,
    })
  },

  onClickProfile() {
    wx.navigateTo({ url: '/pages/profile-editor/profile-editor' })
  },

  onClickUserBasic() {
    wx.navigateTo({ url: '/pages/user-editor/user-editor' })
  },

  onClickSchedule() {
    wx.navigateTo({ url: '/pages/schedule/schedule' })
  },

  goToLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  },
})
