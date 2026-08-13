const { toLocalDateKey } = require('./date-time')
const { SchedulePlanningStatus } = require('../models/schedule')

function createLocalDayStart(epochMillis) {
  const date = new Date(epochMillis)
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ).getTime()
}

function moveToNextLocalDay(dayStartEpochMillis) {
  const date = new Date(dayStartEpochMillis)
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + 1
  ).getTime()
}

function createScheduleDateIndicators(schedules, range) {
  if (!Array.isArray(schedules) || !range) {
    return []
  }

  const indicatorsByDate = {}
  schedules.forEach(schedule => {
    const isConfirmed = (
      schedule.planningStatus === SchedulePlanningStatus.CONFIRMED
    )
    const isInterested = (
      schedule.planningStatus === SchedulePlanningStatus.INTERESTED
    )
    if (!isConfirmed && !isInterested) {
      return
    }

    const clippedStart = Math.max(
      schedule.startAtEpochMillis,
      range.startAtEpochMillis
    )
    const clippedEnd = Math.min(
      schedule.endAtEpochMillis,
      range.endAtEpochMillis
    )
    if (!Number.isFinite(clippedStart)
      || !Number.isFinite(clippedEnd)
      || clippedEnd <= clippedStart) {
      return
    }

    let dayStart = createLocalDayStart(clippedStart)
    while (dayStart < clippedEnd) {
      const dateKey = toLocalDateKey(new Date(dayStart))
      const current = indicatorsByDate[dateKey] || {
        confirmedCount: 0,
        interestedCount: 0,
      }
      indicatorsByDate[dateKey] = {
        confirmedCount: current.confirmedCount + (isConfirmed ? 1 : 0),
        interestedCount: current.interestedCount + (isInterested ? 1 : 0),
      }
      dayStart = moveToNextLocalDay(dayStart)
    }
  })

  return Object.keys(indicatorsByDate)
    .sort()
    .map(dateKey => ({
      dateKey,
      ...indicatorsByDate[dateKey],
    }))
}

module.exports = {
  createScheduleDateIndicators,
}
