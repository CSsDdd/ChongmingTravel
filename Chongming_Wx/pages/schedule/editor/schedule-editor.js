const checkpointRepository = require('../../../repositories/checkpoint-repository')
const scheduleRepository = require('../../../repositories/schedule-repository')
const userRepository = require('../../../repositories/user-repository')
const {
  SchedulePlanningStatus,
  ScheduleRecruitmentStatus,
  ScheduleTargetType,
  ScheduleVisibility,
  canScheduleRecruit,
} = require('../../../models/schedule')
const {
  normalizeLocalDateKey,
  toLocalDateKey,
} = require('../../../utils/date-time')

const VISIBILITY_OPTIONS = [
  { label: '仅自己可见', value: ScheduleVisibility.PRIVATE },
  { label: '公开', value: ScheduleVisibility.PUBLIC },
]

const RECRUITMENT_OPTIONS = [
  { label: '暂不招募', value: ScheduleRecruitmentStatus.NOT_RECRUITING },
  { label: '招募中', value: ScheduleRecruitmentStatus.RECRUITING },
  { label: '已关闭', value: ScheduleRecruitmentStatus.CLOSED },
]

const PLANNING_OPTIONS = [
  { label: '已确认', value: SchedulePlanningStatus.CONFIRMED },
  { label: '感兴趣', value: SchedulePlanningStatus.INTERESTED },
  { label: '已完成', value: SchedulePlanningStatus.COMPLETED },
  { label: '已取消', value: SchedulePlanningStatus.CANCELLED },
]

function padNumber(value) {
  return String(value).padStart(2, '0')
}

function toLocalTimeKey(date) {
  return `${padNumber(date.getHours())}:${padNumber(date.getMinutes())}`
}

function combineLocalDateTime(dateKey, timeKey) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const [hour, minute] = timeKey.split(':').map(Number)
  return new Date(year, month - 1, day, hour, minute).getTime()
}

function findOptionIndex(options, value) {
  const index = options.findIndex(item => item.value === value)
  return index >= 0 ? index : 0
}

function createDraft(data) {
  return {
    targetRef: data.targetRef,
    startDate: data.startDate,
    startTime: data.startTime,
    endDate: data.endDate,
    endTime: data.endTime,
    visibility: data.visibility,
    recruitmentStatus: data.recruitmentStatus,
    planningStatus: data.planningStatus,
    sharedNote: data.sharedNote,
    privateNote: data.privateNote,
  }
}

Page({
  data: {
    mode: 'create',
    scheduleId: '',
    currentUser: null,
    targetRef: null,
    selectedTargetTitle: '请选择打卡点',
    startDate: '',
    startTime: '09:00',
    endDate: '',
    endTime: '11:00',
    visibilityOptions: VISIBILITY_OPTIONS,
    visibilityIndex: 0,
    visibility: ScheduleVisibility.PRIVATE,
    recruitmentOptions: RECRUITMENT_OPTIONS,
    recruitmentIndex: 0,
    recruitmentStatus: ScheduleRecruitmentStatus.NOT_RECRUITING,
    canRecruit: false,
    planningOptions: PLANNING_OPTIONS,
    planningIndex: 0,
    planningStatus: SchedulePlanningStatus.CONFIRMED,
    sharedNote: '',
    privateNote: '',
    isLoading: true,
    isSaving: false,
  },

  async onLoad(options) {
    const mode = options.scheduleId ? 'edit' : 'create'
    wx.setNavigationBarTitle({
      title: mode === 'edit' ? '编辑安排' : '新建安排',
    })
    await this.initializeEditor(mode, options)
  },

  onUnload() {
    wx.disableAlertBeforeUnload()
  },

  async initializeEditor(mode, options) {
    try {
      const currentUser = await userRepository.findCurrent()
      if (!currentUser) {
        throw new Error('请先登录后再编辑安排')
      }

      if (mode === 'edit') {
        await this.loadExistingSchedule(options.scheduleId, currentUser)
        return
      }
      this.loadNewSchedule(options.date, currentUser)
    } catch (error) {
      wx.showToast({ title: error.message || '安排加载失败', icon: 'none' })
      this.setData({ isLoading: false })
    }
  },

  loadNewSchedule(date, currentUser) {
    const selectedDate = normalizeLocalDateKey(date)
    this.setData({
      mode: 'create',
      currentUser,
      startDate: selectedDate,
      endDate: selectedDate,
      isLoading: false,
    }, () => this.rememberInitialDraft())
  },

  async loadExistingSchedule(scheduleId, currentUser) {
    const schedule = await scheduleRepository.findById(scheduleId)
    if (!schedule || schedule.ownerUserId !== currentUser.id) {
      throw new Error('没有找到可编辑的安排')
    }
    if (schedule.targetRef.type !== ScheduleTargetType.CHECKPOINT) {
      throw new Error('当前版本暂不支持编辑路线安排')
    }

    const target = await checkpointRepository.findVersion(
      schedule.targetRef.id,
      schedule.targetRef.version
    )
    if (!target) {
      throw new Error('安排引用的打卡点版本当前不可用')
    }

    const startDateTime = new Date(schedule.startAtEpochMillis)
    const endDateTime = new Date(schedule.endAtEpochMillis)
    this.setData({
      mode: 'edit',
      scheduleId: schedule.id,
      currentUser,
      targetRef: schedule.targetRef,
      selectedTargetTitle: target.title,
      startDate: toLocalDateKey(startDateTime),
      startTime: toLocalTimeKey(startDateTime),
      endDate: toLocalDateKey(endDateTime),
      endTime: toLocalTimeKey(endDateTime),
      visibilityIndex: findOptionIndex(VISIBILITY_OPTIONS, schedule.visibility),
      visibility: schedule.visibility,
      recruitmentIndex: findOptionIndex(
        RECRUITMENT_OPTIONS,
        schedule.recruitmentStatus
      ),
      recruitmentStatus: schedule.recruitmentStatus,
      canRecruit: canScheduleRecruit(
        schedule.planningStatus,
        schedule.visibility
      ),
      planningIndex: findOptionIndex(PLANNING_OPTIONS, schedule.planningStatus),
      planningStatus: schedule.planningStatus,
      sharedNote: schedule.sharedNote,
      privateNote: schedule.privateNote,
      isLoading: false,
    }, () => this.rememberInitialDraft())
  },

  openCheckpointPicker() {

    wx.navigateTo({
      url: '/pages/checkpoint/picker/checkpoint-picker',
      events: {
        checkpointSelected: checkpoint => {
          this.setData({
            targetRef: {
              type: ScheduleTargetType.CHECKPOINT,
              id: checkpoint.id,
              version: checkpoint.version,
            },
            selectedTargetTitle: checkpoint.title,
          }, () => this.updateUnsavedWarning())
        },
      },
    })
  },

  onDateOrTimeChange(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [field]: e.detail.value }, () => {
      this.updateUnsavedWarning()
    })
  },

  onVisibilityChange(e) {
    const visibilityIndex = Number(e.detail.value)
    const visibility = VISIBILITY_OPTIONS[visibilityIndex].value
    const canRecruit = canScheduleRecruit(this.data.planningStatus, visibility)
    const nextData = { visibilityIndex, visibility, canRecruit }
    if (!canRecruit) {
      nextData.recruitmentIndex = 0
      nextData.recruitmentStatus = ScheduleRecruitmentStatus.NOT_RECRUITING
    }
    this.setData(nextData, () => this.updateUnsavedWarning())
  },

  onRecruitmentChange(e) {
    const recruitmentIndex = Number(e.detail.value)
    this.setData({
      recruitmentIndex,
      recruitmentStatus: RECRUITMENT_OPTIONS[recruitmentIndex].value,
    }, () => this.updateUnsavedWarning())
  },

  onPlanningChange(e) {
    const planningIndex = Number(e.detail.value)
    const planningStatus = PLANNING_OPTIONS[planningIndex].value
    const canRecruit = canScheduleRecruit(planningStatus, this.data.visibility)
    const nextData = { planningIndex, planningStatus, canRecruit }
    if (!canRecruit) {
      nextData.recruitmentIndex = 0
      nextData.recruitmentStatus = ScheduleRecruitmentStatus.NOT_RECRUITING
    }
    this.setData(nextData, () => this.updateUnsavedWarning())
  },

  onNoteInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [field]: e.detail.value }, () => {
      this.updateUnsavedWarning()
    })
  },

  rememberInitialDraft() {
    this.initialDraft = JSON.stringify(createDraft(this.data))
    this.hasUnsavedChanges = false
  },

  updateUnsavedWarning() {
    const currentDraft = JSON.stringify(createDraft(this.data))
    const hasChanges = currentDraft !== this.initialDraft
    if (hasChanges === this.hasUnsavedChanges) {
      return
    }
    this.hasUnsavedChanges = hasChanges
    if (hasChanges) {
      wx.enableAlertBeforeUnload({ message: '安排尚未保存，确定离开吗？' })
      return
    }
    wx.disableAlertBeforeUnload()
  },

  disableUnsavedWarning() {
    this.hasUnsavedChanges = false
    wx.disableAlertBeforeUnload()
  },

  createScheduleChanges() {
    if (!this.data.targetRef) {
      throw new Error('请选择安排目标')
    }
    const startAtEpochMillis = combineLocalDateTime(
      this.data.startDate,
      this.data.startTime
    )
    const endAtEpochMillis = combineLocalDateTime(
      this.data.endDate,
      this.data.endTime
    )
    return {
      startAtEpochMillis,
      endAtEpochMillis,
      targetRef: this.data.targetRef,
      visibility: this.data.visibility,
      recruitmentStatus: this.data.recruitmentStatus,
      planningStatus: this.data.planningStatus,
      sharedNote: this.data.sharedNote,
      privateNote: this.data.privateNote,
    }
  },

  async saveSchedule() {
    if (this.data.isSaving) {
      return
    }
    this.setData({ isSaving: true })
    try {
      const changes = this.createScheduleChanges()
      if (this.data.mode === 'edit') {
        await scheduleRepository.update(this.data.scheduleId, changes)
      } else {
        await scheduleRepository.create({
          ownerUserId: this.data.currentUser.id,
          ...changes,
        })
      }
      this.disableUnsavedWarning()
      wx.showToast({ title: '保存成功', icon: 'success' })
      wx.navigateBack()
    } catch (error) {
      wx.showToast({ title: error.message || '保存失败', icon: 'none' })
    } finally {
      this.setData({ isSaving: false })
    }
  },
})
