function createInitialCommentReportState() {
  return {
    schemaVersion: 1,
    nextReportSequence: 1,
    reports: []
  }
}

module.exports = {
  createInitialCommentReportState
}
