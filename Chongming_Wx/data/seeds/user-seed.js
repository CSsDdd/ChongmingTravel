const { createUser } = require('../../models/user')

// 系统作者只用于标识公开样例内容，不会成为当前登录用户。
function createInitialUserState() {
  return {
    nextUserSequence: 1,
    users: [
      createUser({
        id: 'system',
        displayName: '崇明探索',
        createdAtEpochMillis: 0,
        updatedAtEpochMillis: 0,
      }),
    ],
    identities: [],
  }
}

module.exports = {
  createInitialUserState,
}
