function saveLocalFile(tempFilePath) {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().saveFile({
      tempFilePath,
      success: result => resolve(result.savedFilePath),
      fail: reject,
    })
  })
}

// 当前本地版本只直接渲染 URL、微信文件路径和小程序包内绝对路径。
// `sample/...` 等抽象资源 ID 留待后续资源服务解析。
function resolveImageUrl(imageId) {
  const value = typeof imageId === 'string' ? imageId.trim() : ''
  return /^(https?:\/\/|wxfile:\/\/|cloud:\/\/|data:image\/|\/)/.test(value)
    ? value
    : ''
}

function withImageUrl(item) {
  return {
    ...item,
    imageUrl: resolveImageUrl(item.imageId),
  }
}

module.exports = {
  resolveImageUrl,
  saveLocalFile,
  withImageUrl,
}
