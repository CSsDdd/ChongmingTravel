// 首次运行时创建空白安排状态；安排由演示用户在本地创建。
function createInitialScheduleState() {
  return {
    nextScheduleSequence: 1,
    schedules: [],
  }
}

module.exports = {
  createInitialScheduleState,
}
