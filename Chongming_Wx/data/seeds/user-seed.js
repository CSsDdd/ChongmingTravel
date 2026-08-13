// 首次运行时创建空白用户状态；运行中产生的数据写入微信本地存储。
function createInitialUserState() {
  return {
    nextUserSequence: 1,
    users: [],
    identities: [],
  }
}

module.exports = {
  createInitialUserState,
}
