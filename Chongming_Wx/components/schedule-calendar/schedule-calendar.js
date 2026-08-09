const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']
const CALENDAR_CELL_COUNT = 42

function buildCalendarCells(year, month) {
  const firstWeekday = new Date(year, month - 1, 1).getDay()
  const leadingCellCount = (firstWeekday + 6) % 7
  const dayCount = new Date(year, month, 0).getDate()
  const today = new Date()

  return Array.from({ length: CALENDAR_CELL_COUNT }, (_, index) => {
    const day = index - leadingCellCount + 1
    const inMonth = day >= 1 && day <= dayCount
    return {
      key: `calendar-cell-${index}`,
      day: inMonth ? day : '',
      inMonth,
      isToday: inMonth
        && year === today.getFullYear()
        && month === today.getMonth() + 1
        && day === today.getDate(),
    }
  })
}

Component({
  data: {
    title: '',
    weekdayLabels: WEEKDAY_LABELS,
    cells: [],
  },

  lifetimes: {
    attached() {
      const today = new Date()
      const year = today.getFullYear()
      const month = today.getMonth() + 1
      this.setData({
        title: `${year}年${month}月`,
        cells: buildCalendarCells(year, month),
      })
    },
  },
})
