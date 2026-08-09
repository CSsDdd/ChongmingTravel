const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']
const CALENDAR_CELL_COUNT = 42
const {
  moveLocalDateByMonths,
  normalizeLocalDateKey,
  parseLocalDateKey,
  toLocalDateKey,
} = require('../../utils/date-time')

function buildCalendarCells(year, month, selectedDate) {
  const firstWeekday = new Date(year, month - 1, 1).getDay()
  const leadingCellCount = (firstWeekday + 6) % 7
  const dayCount = new Date(year, month, 0).getDate()
  const todayKey = toLocalDateKey(new Date())

  return Array.from({ length: CALENDAR_CELL_COUNT }, (_, index) => {
    const day = index - leadingCellCount + 1
    const inMonth = day >= 1 && day <= dayCount
    const date = inMonth
      ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      : ''
    return {
      key: `calendar-cell-${index}`,
      day: inMonth ? day : '',
      date,
      inMonth,
      isSelected: date === selectedDate,
      isToday: date === todayKey,
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
        cells: buildCalendarCells(year, month, selectedDate),
      })
    },

    onDayTap(e) {
      if (!this.properties.interactive) {
        return
      }
      const { date } = e.currentTarget.dataset
      if (date) {
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
      this.triggerEvent('datechange', { date: nextDate })
    },
  },
})
