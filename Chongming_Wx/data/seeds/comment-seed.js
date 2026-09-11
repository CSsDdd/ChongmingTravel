function createInitialCommentState() {
  return {
    schemaVersion: 1,
    nextCommentSequence: 1,
    comments: [],
    likes: []
  }
}

module.exports = {
  createInitialCommentState
}
