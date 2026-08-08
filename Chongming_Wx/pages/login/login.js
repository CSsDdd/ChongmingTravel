const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

Page({
  data: {
    motto: '从崇明开始一次户外探索',
    userInfo: {
      avatarUrl: defaultAvatarUrl,
      nickName: '',
    },
    hasUserInfo: false,
    canIUseGetUserProfile: wx.canIUse('getUserProfile'),
    canIUseNicknameComp: wx.canIUse('input.type.nickname'),
  },

  onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    const { nickName } = this.data.userInfo
    this.setData({
      'userInfo.avatarUrl': avatarUrl,
      hasUserInfo: Boolean(
        nickName && avatarUrl && avatarUrl !== defaultAvatarUrl
      ),
    })
  },

  onInputChange(e) {
    const nickName = e.detail.value
    const { avatarUrl } = this.data.userInfo
    this.setData({
      'userInfo.nickName': nickName,
      hasUserInfo: Boolean(
        nickName && avatarUrl && avatarUrl !== defaultAvatarUrl
      ),
    })
  },

  getUserProfile() {
    wx.getUserProfile({
      desc: '用于展示用户头像和昵称',
      success: (res) => {
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true,
        })
      },
    })
  },

  enterApp() {
    wx.switchTab({
      url: '/pages/discovery/discovery',
    })
  },
})
