const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

function padNumber(value) {
  return String(value).padStart(2, '0')
}

function toLocalDateKey(date) {
  return [
    date.getFullYear(),
    padNumber(date.getMonth() + 1),
    padNumber(date.getDate()),
  ].join('-')
}

function parseLocalDateKey(value) {
  const match = typeof value === 'string'
    ? DATE_KEY_PATTERN.exec(value)
    : null
  if (!match) {
    return null
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day) {
    return null
  }
  return { year, month, day }
}

function normalizeLocalDateKey(value) {
  return parseLocalDateKey(value)
    ? value
    : toLocalDateKey(new Date())
}

function createLocalDayRange(value) {
  const dateParts = parseLocalDateKey(value)
  if (!dateParts) {
    throw new Error('日期格式必须为 YYYY-MM-DD')
  }

  const { year, month, day } = dateParts
  return {
    startAtEpochMillis: new Date(year, month - 1, day).getTime(),
    endAtEpochMillis: new Date(year, month - 1, day + 1).getTime(),
  }
}

function formatLocalDateLabel(value) {
  const dateParts = parseLocalDateKey(value)
  return dateParts
    ? `${dateParts.year}年${dateParts.month}月${dateParts.day}日`
    : ''
}

function moveLocalDateByMonths(value, offset) {
  const dateParts = parseLocalDateKey(normalizeLocalDateKey(value))
  const targetMonth = new Date(
    dateParts.year,
    dateParts.month - 1 + offset,
    1
  )
  const dayCount = new Date(
    targetMonth.getFullYear(),
    targetMonth.getMonth() + 1,
    0
  ).getDate()
  targetMonth.setDate(Math.min(dateParts.day, dayCount))
  return toLocalDateKey(targetMonth)
}

module.exports = {
  createLocalDayRange,
  formatLocalDateLabel,
  moveLocalDateByMonths,
  normalizeLocalDateKey,
  parseLocalDateKey,
  toLocalDateKey,
}
