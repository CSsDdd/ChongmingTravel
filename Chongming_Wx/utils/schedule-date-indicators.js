const { toLocalDateKey } = require('./date-time')

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

  const countsByDate = {}
  schedules.forEach(schedule => {
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
      countsByDate[dateKey] = (countsByDate[dateKey] || 0) + 1
      dayStart = moveToNextLocalDay(dayStart)
    }
  })

  return Object.keys(countsByDate)
    .sort()
    .map(dateKey => ({
      dateKey,
      count: countsByDate[dateKey],
    }))
}

module.exports = {
  createScheduleDateIndicators,
}
