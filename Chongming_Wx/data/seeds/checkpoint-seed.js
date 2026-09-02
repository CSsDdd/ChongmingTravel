const {
  CoordinateSystem,
  SYSTEM_CHECKPOINT_OWNER_USER_ID,
  createCheckpoint,
  createCheckpointVersion,
} = require('../../models/checkpoint')

// 固定时间便于清空本地存储后重复观察同一批演示数据。
const SAMPLE_PUBLISHED_AT = Date.UTC(2026, 8, 2, 8)

function createInitialCheckpointVersions() {
  return [
    createCheckpointVersion({
      checkpointId: 'sample_liberation_landing_memorial',
      ownerUserId: SYSTEM_CHECKPOINT_OWNER_USER_ID,
      version: 1,
      location: {
        // 文档只提供地址，暂用地址附近的近似坐标。
        latitude: 31.62,
        longitude: 121.52,
        locationName: '新河镇天新村新艺3队团城公路旁',
        coordinateSystem: CoordinateSystem.GCJ02,
      },
      title: '解放崇明岛登陆纪念碑',
      shortText: '纪念解放军登陆崇明岛的露天纪念碑，可在这里了解崇明解放历史。',
      imageId: '/assets/seed/checkpoints/liberation-landing-memorial.jpg',
      tagIds: ['红色文化', '历史', '纪念碑'],
      publishedAtEpochMillis: SAMPLE_PUBLISHED_AT,
    }),
    createCheckpointVersion({
      checkpointId: 'sample_shili_bund_sunset',
      ownerUserId: SYSTEM_CHECKPOINT_OWNER_USER_ID,
      version: 1,
      location: {
        // 地图截图未包含坐标值，暂用十里外滩附近的近似坐标。
        latitude: 31.81,
        longitude: 121.66,
        locationName: '碧桂园十里外滩',
        coordinateSystem: CoordinateSystem.GCJ02,
      },
      title: '十里外滩的开阔夕阳',
      shortText: '临水区域视野开阔、遮挡较少，适合在傍晚安静地等待落日。',
      imageId: '/assets/seed/checkpoints/shili-bund-sunset.jpg',
      tagIds: ['夕阳', '滨水', '摄影'],
      publishedAtEpochMillis: SAMPLE_PUBLISHED_AT,
    }),
    createCheckpointVersion({
      checkpointId: 'sample_m515_creative_center',
      ownerUserId: SYSTEM_CHECKPOINT_OWNER_USER_ID,
      version: 1,
      location: {
        // 文档只提供地址，暂用宏海公路 515 号附近的近似坐标。
        latitude: 31.67,
        longitude: 121.36,
        locationName: '崇明区庙镇宏海公路515号',
        coordinateSystem: CoordinateSystem.GCJ02,
      },
      title: 'M515文创中心',
      shortText: '由老厂房改造的文创空间，可体验手作、咖啡、展览与户外活动。',
      imageId: '/assets/seed/checkpoints/m515-creative-center.jpg',
      tagIds: ['文创', '手作', '休闲'],
      publishedAtEpochMillis: SAMPLE_PUBLISHED_AT,
    }),
    createCheckpointVersion({
      checkpointId: 'sample_kalajun_grassland',
      ownerUserId: SYSTEM_CHECKPOINT_OWNER_USER_ID,
      version: 1,
      location: {
        latitude: 43.065713,
        longitude: 82.088099,
        locationName: '新疆伊犁州特克斯县喀拉峻大草原',
        coordinateSystem: CoordinateSystem.GCJ02,
      },
      title: '喀拉峻的高山草原',
      shortText: '高山草甸向远处舒展，适合沿草原步道观察开阔地貌与牧场景观。',
      imageId: '/assets/seed/checkpoints/kalajun-grassland.jpg',
      tagIds: ['草原', '徒步', '自然风光'],
      publishedAtEpochMillis: SAMPLE_PUBLISHED_AT,
    }),
    createCheckpointVersion({
      checkpointId: 'sample_xiata_scenic_area',
      ownerUserId: SYSTEM_CHECKPOINT_OWNER_USER_ID,
      version: 1,
      location: {
        latitude: 42.668839,
        longitude: 80.588177,
        locationName: '新疆伊犁州昭苏县夏塔旅游景区',
        coordinateSystem: CoordinateSystem.GCJ02,
      },
      title: '夏塔雪山下的森林草地',
      shortText: '雪山、森林与草原在山谷中交叠，是体验夏塔古道与徒步风景的入口。',
      imageId: '/assets/seed/checkpoints/xiata-scenic-area.jpg',
      tagIds: ['雪山', '森林', '徒步'],
      publishedAtEpochMillis: SAMPLE_PUBLISHED_AT,
    }),
    createCheckpointVersion({
      checkpointId: 'sample_zhaosu_jade_lake',
      ownerUserId: SYSTEM_CHECKPOINT_OWNER_USER_ID,
      version: 1,
      location: {
        latitude: 42.733584,
        longitude: 81.0565,
        locationName: '新疆伊犁州昭苏县阿合牙孜沟玉湖',
        coordinateSystem: CoordinateSystem.GCJ02,
      },
      title: '藏在山谷里的昭苏玉湖',
      shortText: '湖水会随季节与光线呈现不同颜色，周围可见山谷、草坡与森林。',
      imageId: '/assets/seed/checkpoints/zhaosu-jade-lake.jpg',
      tagIds: ['湖泊', '山谷', '摄影'],
      publishedAtEpochMillis: SAMPLE_PUBLISHED_AT,
    }),
  ]
}

function createInitialCheckpointState() {
  const versions = createInitialCheckpointVersions()
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

// 系统公开打卡点不自动进入个人工作区；新建时再生成用户草稿。
function createInitialCheckpointDraftState(
  publishedState = createInitialCheckpointState()
) {
  return {
    schemaVersion: publishedState.schemaVersion,
    nextCheckpointSequence: publishedState.nextCheckpointSequence,
    checkpoints: [],
    versions: [],
  }
}

module.exports = {
  createInitialCheckpointDraftState,
  createInitialCheckpointState,
}
