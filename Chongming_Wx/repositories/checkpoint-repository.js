const sampleCheckpoints = require('../data/sample-checkpoints')

async function findPublished() {
  return sampleCheckpoints.map(checkpoint => ({ ...checkpoint }))
}

async function findVersion(checkpointId, version) {
  const checkpoint = sampleCheckpoints.find(item => (
    item.checkpointId === checkpointId && item.version === version
  ))
  return checkpoint ? { ...checkpoint } : null
}

/**
 * @param {{ text?: string }} query //简单声明query，字段可添加
 */

// 在公开范围内查找
async function searchPublished(query = {}) {
  let results = await findPublished()//先获取全部备选（公开范围）
  const text = String(query.text ?? '')//文本规范化
    .normalize('NFKC')
    .trim()
    .toLowerCase()

  if (text) {
    results = results.filter(checkpoint => {
      const searchableFields = [
        checkpoint.title,
        checkpoint.location.locationName,
        checkpoint.shortText,
        ...checkpoint.tagIds,
      ]

      return searchableFields.some(field =>
        String(field)
          .normalize('NFKC')
          .toLowerCase()
          .includes(text)
      )
    })
  }

  return results
}

module.exports = {
  findPublished,
  findVersion,
  searchPublished,
}
