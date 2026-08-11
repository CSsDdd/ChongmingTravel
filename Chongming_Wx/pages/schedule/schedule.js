const { findVersion } = require('../../repositories/checkpoint-repository')
const { findByOwnerAndRange } = require('../../repositories/schedule-repository')
const userRepository = require('../../repositories/user-repository')
const {
  formatLocalDateLabel,
  normalizeLocalDateKey,
  createLocalDayRange,
  createLocalCalendarGridRange,
} = require('../../utils/date-time')
const {
  createScheduleDateIndicators,
} = require('../../utils/schedule-date-indicators')

const PLANNING_STATUS_TEXT = Object.freeze({
  CONFIRMED: '已确认',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
})

const RECRUITMENT_STATUS_TEXT = Object.freeze({
  NOT_RECRUITING: '停止招募',
  RECRUITING: '招募中',
  CLOSED: '已关闭',
})

function formatTime(epochMillis) {
  const date = new Date(epochMillis)
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${hour}:${minute}`
}

async function toScheduleCard(schedule, currentUserId) {
  const isOwner = schedule.ownerUserId === currentUserId
  const target = await findVersion(
    schedule.targetRef.id,
    schedule.targetRef.version
  )

  const planningText = (
    PLANNING_STATUS_TEXT[schedule.planningStatus]
    || '未知计划状态'
  )

  const recruitmentText = (
    RECRUITMENT_STATUS_TEXT[schedule.recruitmentStatus]
    || '未知招募状态'
  )

  return {
    ...schedule,
    timeText: `${formatTime(schedule.startAtEpochMillis)}–${formatTime(
      schedule.endAtEpochMillis
    )}`,
    targetTitle: target ? target.title : '目标不可用',
    statusText: `${planningText} · ${recruitmentText}`,
    privateNote: isOwner ? schedule.privateNote : '',
    canViewPrivateNote: isOwner,
    canEdit: isOwner,
  }
}

Page({
  data: {
    currentUser: null,
    ownerUserId: '',
    canManageSchedules: false,
    selectedDate: '',
    selectedDateLabel: '',
    schedules: [],
    dateIndicators: [],
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
    const ownerUserId = currentUser ? currentUser.id : ''
    this.setData({
      currentUser,
      ownerUserId,
      canManageSchedules: Boolean(
        currentUser && currentUser.id === ownerUserId
      ),
      hasLoadedCurrentUser: true,
    }, () => {
      this.loadSchedulesForSelectedDate()
      this.loadDateIndicatorsForMonth(this.data.selectedDate)
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

  onMonthChange(e) {
    this.loadDateIndicatorsForMonth(e.detail.date)
  },

  async loadSchedulesForSelectedDate() {
    const { currentUser, ownerUserId, selectedDate } = this.data
    if (!ownerUserId) {
      this.setData({ schedules: [] })
      return
    }

    const {
      startAtEpochMillis,
      endAtEpochMillis,
    } = createLocalDayRange(selectedDate)
    const schedules = await findByOwnerAndRange(
      ownerUserId,
      startAtEpochMillis,
      endAtEpochMillis
    )
    const currentUserId = currentUser ? currentUser.id : ''
    const scheduleCards = await Promise.all(
      schedules.map(schedule => toScheduleCard(schedule, currentUserId))
    )
    this.setData({ schedules: scheduleCards })
  },

  async loadDateIndicatorsForMonth(dateKey) {
    const { ownerUserId } = this.data
    if (!ownerUserId) {
      this.setData({ dateIndicators: [] })
      return
    }

    const range = createLocalCalendarGridRange(dateKey)
    const schedules = await findByOwnerAndRange(
      ownerUserId,
      range.startAtEpochMillis,
      range.endAtEpochMillis
    )
    this.setData({
      dateIndicators: createScheduleDateIndicators(schedules, range),
    })
  },

  goToLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  },

  goToScheduleEditor(e) {
    const scheduleId = e.currentTarget.dataset.scheduleId
    const schedule = this.data.schedules.find(
      item => item.id === scheduleId
    )
  
    // 没有 ID，说明点击的是“添加安排”
    if (!scheduleId && !this.data.canManageSchedules) {
      wx.showToast({ title: '只能为自己添加安排', icon: 'none' })
      return
    }
  
    // 有 ID，说明点击的是已有安排
    if (scheduleId && (!schedule || !schedule.canEdit)) {
      wx.showToast({ title: '只能编辑自己的安排', icon: 'none' })
      return
    }
  
    const query = scheduleId
      ? `scheduleId=${encodeURIComponent(scheduleId)}`
      : `date=${encodeURIComponent(this.data.selectedDate)}`
  
    wx.navigateTo({
      url: `/pages/schedule-editor/schedule-editor?${query}`,
    })
  }
})
