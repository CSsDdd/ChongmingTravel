const userRepository = require('../../repositories/user-repository')
const {
  formatLocalDateLabel,
  normalizeLocalDateKey,
} = require('../../utils/date-time')

Page({
  data: {
    currentUser: null,
    selectedDate: '',
    selectedDateLabel: '',
    schedules: [],
    hasLoadedCurrentUser: false,
  },

  onLoad(options) {
    const selectedDate = normalizeLocalDateKey(options.date)
    this.setData({
      selectedDate,
      selectedDateLabel: formatLocalDateLabel(selectedDate),
    })
  },

  async onShow() {
    const currentUser = await userRepository.findCurrent()
    this.setData({
      currentUser,
      hasLoadedCurrentUser: true,
    }, () => {
      this.loadSchedulesForSelectedDate()
    })
  },

  onDateChange(e) {
    const selectedDate = normalizeLocalDateKey(e.detail.date)
    this.setData({
      selectedDate,
      selectedDateLabel: formatLocalDateLabel(selectedDate),
    }, () => {
      this.loadSchedulesForSelectedDate()
    })
  },

  loadSchedulesForSelectedDate() {
    // ScheduleRepository 接入后在此按用户和日期范围查询。
    this.setData({ schedules: [] })
  },

  goToLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  },
})
