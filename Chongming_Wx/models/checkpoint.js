const CoordinateSystem = Object.freeze({
  WGS84: 'WGS84',
  GCJ02: 'GCJ02',
})

function createCheckpointVersion(input) {
  return {
    checkpointId: input.checkpointId,
    version: input.version,
    location: input.location,
    title: input.title,
    shortText: input.shortText,
    imageId: input.imageId,
    tagIds: [...input.tagIds],
    tagText: input.tagIds.join(' · '),
    publishedAtEpochMillis: input.publishedAtEpochMillis,
  }
}

module.exports = {
  CoordinateSystem,
  createCheckpointVersion,
}
