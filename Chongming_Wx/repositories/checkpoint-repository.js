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

module.exports = {
  findPublished,
  findVersion,
}
