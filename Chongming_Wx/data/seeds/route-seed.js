const {
  RouteTrafficMode,
  SYSTEM_ROUTE_OWNER_USER_ID,
  createRoute,
  createRouteVersion,
} = require('../../models/route')

const SAMPLE_PUBLISHED_AT = Date.UTC(2026, 8, 2, 8)

function createInitialRouteVersions() {
  return [
    createRouteVersion({
      routeId: 'route-000001',
      ownerUserId: SYSTEM_ROUTE_OWNER_USER_ID,
      version: 1,
      title: '崇明人文与夕阳一日线',
      description: '上午了解崇明历史，下午逛文创空间，最后前往开阔水边等待落日。',
      note: '三个地点间建议驾车移动，出发前可根据天气调整夕阳点的停留时间。',
      coverImageId: '/assets/seed/checkpoints/shili-bund-sunset.jpg',
      tagIds: ['历史', '文创', '夕阳'],
      stops: [
        {
          checkpointId: 'sample_liberation_landing_memorial',
          checkpointVersion: 1,
          note: '从纪念碑开始，简单了解崇明岛的解放历史。',
          trafficToNext: RouteTrafficMode.DRIVING,
        },
        {
          checkpointId: 'sample_m515_creative_center',
          checkpointVersion: 1,
          note: '下午在文创中心逛展、体验手作或稍作休息。',
          trafficToNext: RouteTrafficMode.DRIVING,
        },
        {
          checkpointId: 'sample_shili_bund_sunset',
          checkpointVersion: 1,
          note: '傍晚到达水边，以观看夕阳结束行程。',
          trafficToNext: null,
        },
      ],
      publishedAtEpochMillis: SAMPLE_PUBLISHED_AT,
    }),
    createRouteVersion({
      routeId: 'route-000002',
      ownerUserId: SYSTEM_ROUTE_OWNER_USER_ID,
      version: 1,
      title: '昭苏玉湖与夏塔雪山线',
      description: '串联昭苏山谷中的玉湖与夏塔景区，集中体验湖泊、森林和雪山景观。',
      note: '山区天气变化较快，本路线仅作数据展示，实际出行需关注景区公告与路况。',
      coverImageId: '/assets/seed/checkpoints/zhaosu-jade-lake.jpg',
      tagIds: ['湖泊', '雪山', '自驾'],
      stops: [
        {
          checkpointId: 'sample_zhaosu_jade_lake',
          checkpointVersion: 1,
          note: '在湖边观察水色与山谷地貌，避免进入未开放区域。',
          trafficToNext: RouteTrafficMode.DRIVING,
        },
        {
          checkpointId: 'sample_xiata_scenic_area',
          checkpointVersion: 1,
          note: '以夏塔雪山和森林景观作为路线终点。',
          trafficToNext: null,
        },
      ],
      publishedAtEpochMillis: SAMPLE_PUBLISHED_AT,
    }),
  ]
}

function createInitialRouteState() {
  const versions = createInitialRouteVersions()
  const routes = versions.map(version => createRoute({
    id: version.routeId,
    ownerUserId: version.ownerUserId,
    sourceRouteRef: null,
    latestVersion: version.version,
    currentPublishedVersion: version.version,
    createdAtEpochMillis: version.publishedAtEpochMillis,
  }))

  return {
    schemaVersion: 1,
    nextRouteSequence: 3,
    routes,
    versions,
  }
}

// 系统公开路线不自动进入个人工作区；复制或新建时再生成用户草稿。
function createInitialRouteDraftState(
  publishedState = createInitialRouteState()
) {
  return {
    schemaVersion: publishedState.schemaVersion,
    nextRouteSequence: publishedState.nextRouteSequence,
    routes: [],
    versions: [],
  }
}

module.exports = {
  createInitialRouteDraftState,
  createInitialRouteState,
}
