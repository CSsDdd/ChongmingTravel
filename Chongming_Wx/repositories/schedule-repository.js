const {
  createInitialScheduleState,
} = require('../data/seeds/schedule-seed')
const { createSchedule } = require('../models/schedule')
const userRepository = require('./user-repository')

const STORAGE_KEY = 'sample-schedule-repository-v1'

// 深复制可 JSON 序列化的数据
function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

// 验证并清理非空字符串
function requireText(value, fieldName) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) {
    throw new Error(`${fieldName}不能为空`)
  }
  return text
}

// 恢复并规范化本地存储状态
function normalizeState(rawState) {
  const source = rawState && Array.isArray(rawState.schedules)
    ? rawState
    : createInitialScheduleState()
  return {
    nextScheduleSequence: Number.isInteger(source.nextScheduleSequence)
      && source.nextScheduleSequence > 0
      ? source.nextScheduleSequence
      : 1,
    schedules: source.schedules.map(item => createSchedule(item)),
  }
}

// 从本地存储获取并规范化状态
function loadState() {
  return normalizeState(wx.getStorageSync(STORAGE_KEY))
}

// 将完整状态写入本地存储
function saveState(state) {
  wx.setStorageSync(STORAGE_KEY, state)
}

// 生成下一个未被占用的安排 ID
function allocateScheduleId(state) {
  let sequence = state.nextScheduleSequence
  let scheduleId = ''
  do {
    scheduleId = `schedule-${String(sequence).padStart(6, '0')}`
    sequence += 1
  } while (state.schedules.some(item => item.id === scheduleId))
  state.nextScheduleSequence = sequence
  return scheduleId
}

// 验证查询时间范围是否合法
function validateRange(rangeStart, rangeEnd) {
  if (!Number.isFinite(rangeStart) || rangeStart < 0
    || !Number.isFinite(rangeEnd) || rangeEnd <= rangeStart) {
    throw new Error('查询时间范围无效')
  }
}

// 外部接口
// 根据安排id查询安排信息
async function findById(scheduleId) {
  const normalizedId = requireText(scheduleId, '安排ID')
  const schedule = loadState().schedules.find(item => (
    item.id === normalizedId
  ))
  return schedule ? clone(schedule) : null
}

// 查询某用户在特定时间段内有重叠的安排
async function findByOwnerAndRange(ownerUserId, rangeStart, rangeEnd) {
  const normalizedOwnerId = requireText(ownerUserId, '所属用户ID')
  validateRange(rangeStart, rangeEnd)
  const schedules = loadState().schedules
    .filter(item => item.ownerUserId === normalizedOwnerId
      && item.startAtEpochMillis < rangeEnd
      && item.endAtEpochMillis > rangeStart)
    .sort((left, right) => (
      left.startAtEpochMillis - right.startAtEpochMillis
      || left.id.localeCompare(right.id)
    ))
  return clone(schedules)
}

// 创建新的安排记录
async function create(scheduleInput) {
  if (!scheduleInput || typeof scheduleInput !== 'object') {// 基础检查：输入必须是非空对象
    throw new Error('安排数据不能为空')
  }
  const owner = await userRepository.findById(scheduleInput.ownerUserId)// 验证所属用户存在
  if (!owner) {
    throw new Error('无法为不存在的用户创建安排')
  }

  const state = loadState()// 加载当前本地安排状态
  const now = Date.now()// 当前时间戳（毫秒）
  const schedule = createSchedule({// 创建并完整验证新的安排对象
    ...scheduleInput,
    id: allocateScheduleId(state),// 分配新 ID，同时推进状态中的自增序号
    createdAtEpochMillis: now,
    updatedAtEpochMillis: now,
  })
  state.schedules.push(schedule)// 将新安排加入记录集合
  saveState(state)// 保存完整状态
  return clone(schedule)// 返回与存储状态分离的副本
}

// 编辑已有安排记录
async function update(scheduleId, changes) {
  const normalizedId = requireText(scheduleId, '安排ID')// 验证并规范化安排 ID
  if (!changes || typeof changes !== 'object') {// 基础检查：修改内容必须是对象
    throw new Error('安排修改内容不能为空')
  }

  const state = loadState()// 加载当前本地安排状态
  const index = state.schedules.findIndex(item => item.id === normalizedId)// 查找目标记录索引
  const storedSchedule = state.schedules[index]// 根据索引取得原始安排
  if (!storedSchedule) {// 验证目标安排存在
    throw new Error('要修改的安排不存在')
  }
  // 合并修改内容，并重新构造、验证安排对象
  const updatedSchedule = createSchedule({
    ...storedSchedule,
    ...changes,
    id: storedSchedule.id,
    ownerUserId: storedSchedule.ownerUserId,
    sourceInvitationId: storedSchedule.sourceInvitationId,
    createdAtEpochMillis: storedSchedule.createdAtEpochMillis,
    updatedAtEpochMillis: Date.now(),
  })
  state.schedules[index] = updatedSchedule// 替换原索引处的记录
  saveState(state)// 保存完整状态
  return clone(updatedSchedule)// 返回与存储状态分离的副本
}

module.exports = {
  create,
  findById,
  findByOwnerAndRange,
  update,
}
