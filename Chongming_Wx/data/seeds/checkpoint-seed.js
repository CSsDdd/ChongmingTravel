const {
  CoordinateSystem,
  SYSTEM_CHECKPOINT_OWNER_USER_ID,
  createCheckpoint,
  createCheckpointDraft,
  createCheckpointVersion,
} = require('../../models/checkpoint')

function createInitialCheckpointState() {
  const versions = [
    createCheckpointVersion({
      checkpointId: 'sample_birdwatching_deck',//先手动维护ID
      ownerUserId: SYSTEM_CHECKPOINT_OWNER_USER_ID,
      version: 1,//手动维护版本 ，这两处在repo完善后应当修改
      location: {
        latitude: 31.62,
        longitude: 121.93,
        locationName: '东滩观鸟步道',
        coordinateSystem: CoordinateSystem.GCJ02,
      },
      title: '藏在东滩芦苇边的观鸟视角',
      shortText: '沿木栈道走到开阔处，适合安静观察湿地鸟类。',
      imageId: 'sample/checkpoint_birdwatching',
      tagIds: ['湿地', '观鸟', '亲子'],
      publishedAtEpochMillis: 0,
    }),
    createCheckpointVersion({
      checkpointId: 'sample_metasequoia_road',
      ownerUserId: SYSTEM_CHECKPOINT_OWNER_USER_ID,
      version: 1,
      location: {
        latitude: 31.68,
        longitude: 121.48,
        locationName: '森林公园水杉路',
        coordinateSystem: CoordinateSystem.GCJ02,
      },
      title: '水杉林间的笔直小路',
      shortText: '树影覆盖的林间道路，适合散步和拍摄纵深构图。',
      imageId: 'sample/checkpoint_metasequoia',
      tagIds: ['森林', '摄影', '步行'],
      publishedAtEpochMillis: 0,
    }),
    createCheckpointVersion({
      checkpointId: 'sample_lakeside_walk',
      ownerUserId: SYSTEM_CHECKPOINT_OWNER_USER_ID,
      version: 1,
      location: {
        latitude: 31.73,
        longitude: 121.25,
        locationName: '湖畔木栈道',
        coordinateSystem: CoordinateSystem.GCJ02,
      },
      title: '贴近水面的湖畔栈道',
      shortText: '傍晚光线柔和，可以沿水边完成一段轻松步行。',
      imageId: 'sample/checkpoint_lakeside',
      tagIds: ['湖景', '日落', '轻徒步'],
      publishedAtEpochMillis: 0,
    }),
    createCheckpointVersion({
      checkpointId: 'sample_riverside_grass',
      ownerUserId: SYSTEM_CHECKPOINT_OWNER_USER_ID,
      version: 1,
      location: {
        latitude: 31.35,
        longitude: 121.84,
        locationName: '江堤草地',
        coordinateSystem: CoordinateSystem.GCJ02,
      },
      title: '看风吹草浪的江堤',
      shortText: '视野开阔、风力较大，适合短暂停留和观察云层。',
      imageId: 'sample/checkpoint_riverside',
      tagIds: ['江景', '草地', '自然观察'],
      publishedAtEpochMillis: 0,
    }),
  ]

  const checkpoints = versions.map(version => createCheckpoint({
    id: version.checkpointId,
    ownerUserId: version.ownerUserId,
    latestVersion: version.version,
    currentPublishedVersion: version.version,
  }))

  return {
    schemaVersion: 1,
    nextCheckpointSequence: 1,
    checkpoints,
    versions,
  }
}

// 首次创建草稿仓库时，用最新正式内容生成领先一版的可编辑草稿。
function createInitialCheckpointDraftState(
  publishedState = createInitialCheckpointState()
) {
  const draftEntries = publishedState.checkpoints.map(checkpoint => {
    const publishedVersion = publishedState.versions.find(version => (
      version.checkpointId === checkpoint.id
      && version.version === checkpoint.currentPublishedVersion
    ))
    if (!publishedVersion) {
      return null
    }

    const draftVersion = createCheckpointDraft({
      ...publishedVersion,
      version: publishedVersion.version + 1,
    })
    return {
      checkpoint: createCheckpoint({
        id: checkpoint.id,
        ownerUserId: checkpoint.ownerUserId,
        latestVersion: draftVersion.version,
        currentPublishedVersion: checkpoint.currentPublishedVersion,
      }),
      draftVersion,
    }
  }).filter(Boolean)

  return {
    schemaVersion: publishedState.schemaVersion,
    nextCheckpointSequence: publishedState.nextCheckpointSequence,
    checkpoints: draftEntries.map(entry => entry.checkpoint),
    versions: draftEntries.map(entry => entry.draftVersion),
  }
}

module.exports = {
  createInitialCheckpointDraftState,
  createInitialCheckpointState,
}
