const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']
const CALENDAR_CELL_COUNT = 42
const {
  moveLocalDateByMonths,
  normalizeLocalDateKey,
  parseLocalDateKey,
  toLocalDateKey,
} = require('../../utils/date-time')

function createIndicatorCounts(dateIndicators) {
  const counts = {}
  if (!Array.isArray(dateIndicators)) {
    return counts
  }
  dateIndicators.forEach(indicator => {
    if (!indicator || typeof indicator.dateKey !== 'string') {
      return
    }
    const count = Number.isInteger(indicator.count) && indicator.count > 0
      ? indicator.count
      : 1
    counts[indicator.dateKey] = count
  })
  return counts
}

function buildCalendarCells(year, month, selectedDate, dateIndicators) {
  const firstWeekday = new Date(year, month - 1, 1).getDay()
  const leadingCellCount = (firstWeekday + 6) % 7
  const dayCount = new Date(year, month, 0).getDate()
  const todayKey = toLocalDateKey(new Date())
  const indicatorCounts = createIndicatorCounts(dateIndicators)

  return Array.from({ length: CALENDAR_CELL_COUNT }, (_, index) => {
    const day = index - leadingCellCount + 1
    const inMonth = day >= 1 && day <= dayCount
    const cellDate = new Date(year, month - 1, day)
    const date = toLocalDateKey(cellDate)
    return {
      key: `calendar-cell-${index}`,
      day: cellDate.getDate(),
      date,
      inMonth,
      isSelected: date === selectedDate,
      isToday: inMonth && date === todayKey,
      indicatorCount: indicatorCounts[date] || 0,
      hasIndicator: Boolean(indicatorCounts[date]),
    }
  })
}

Component({
  properties: {
    interactive: {
      type: Boolean,
      value: false,
    },
    selectedDate: {
      type: String,
      value: '',
      observer(value) {
        this.refreshCalendar(value)
      },
    },
    dateIndicators: {
      type: Array,
      value: [],
      observer() {
        this.refreshCalendar(this.properties.selectedDate)
      },
    },
  },

  data: {
    title: '',
    weekdayLabels: WEEKDAY_LABELS,
    cells: [],
    visibleYear: 0,
    visibleMonth: 0,
  },

  lifetimes: {
    attached() {
      this.refreshCalendar(this.properties.selectedDate)
    },
  },

  methods: {
    refreshCalendar(value) {
      const selectedDate = normalizeLocalDateKey(value)
      const { year, month } = parseLocalDateKey(selectedDate)
      this.setData({
        title: `${year}年${month}月`,
        visibleYear: year,
        visibleMonth: month,
        cells: buildCalendarCells(
          year,
          month,
          selectedDate,
          this.properties.dateIndicators
        ),
      })
    },

    onDayTap(e) {
      if (!this.properties.interactive) {
        return
      }
      const { date } = e.currentTarget.dataset
      if (date) {
        const { year, month } = parseLocalDateKey(date)
        if (year !== this.data.visibleYear || month !== this.data.visibleMonth) {
          this.triggerEvent('monthchange', { date, year, month })
        }
        this.triggerEvent('datechange', { date })
      }
    },

    onPreviousMonth() {
      this.moveMonth(-1)
    },

    onNextMonth() {
      this.moveMonth(1)
    },

    moveMonth(offset) {
      if (!this.properties.interactive) {
        return
      }
      const selectedDate = normalizeLocalDateKey(
        this.properties.selectedDate
      )
      const nextDate = moveLocalDateByMonths(selectedDate, offset)
      const { year, month } = parseLocalDateKey(nextDate)
      this.triggerEvent('monthchange', { date: nextDate, year, month })
      this.triggerEvent('datechange', { date: nextDate })
    },
  },
})
