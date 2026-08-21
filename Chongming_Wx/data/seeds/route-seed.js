const {
  RouteTrafficMode,
  SYSTEM_ROUTE_OWNER_USER_ID,
  createRoute,
  createRouteVersion,
} = require('../../models/route')

function createInitialRouteVersions() {
  return [
    createRouteVersion({
      routeId: 'route-000001',
      ownerUserId: SYSTEM_ROUTE_OWNER_USER_ID,
      version: 1,
      title: '东滩湿地亲子观察线',
      description: '从观鸟步道出发，再前往开阔江堤观察湿地与云层。',
      note: '沿途风力可能较大，建议准备防风外套和饮用水。',
      coverImageId: '',
      tagIds: ['湿地', '观鸟', '亲子'],
      stops: [
        {
          checkpointId: 'sample_birdwatching_deck',
          checkpointVersion: 1,
          note: '建议保持安静，避免惊扰鸟类。',
          trafficToNext: RouteTrafficMode.DRIVING,
        },
        {
          checkpointId: 'sample_riverside_grass',
          checkpointVersion: 1,
          note: '适合短暂停留并观察天气变化。',
          trafficToNext: null,
        },
      ],
      publishedAtEpochMillis: 0,
    }),
    createRouteVersion({
      routeId: 'route-000002',
      ownerUserId: SYSTEM_ROUTE_OWNER_USER_ID,
      version: 1,
      title: '森林湖畔轻松探索线',
      description: '串联水杉林和湖畔栈道，适合散步、摄影和傍晚观景。',
      note: '雨后木栈道可能湿滑，建议穿着防滑鞋。',
      coverImageId: 'sample/checkpoint_metasequoia',
      tagIds: ['森林', '湖景', '轻徒步'],
      stops: [
        {
          checkpointId: 'sample_metasequoia_road',
          checkpointVersion: 1,
          note: '可以在林间道路拍摄纵深构图。',
          trafficToNext: RouteTrafficMode.CYCLING,
        },
        {
          checkpointId: 'sample_lakeside_walk',
          checkpointVersion: 1,
          note: '傍晚到达时更适合观察湖面光线。',
          trafficToNext: null,
        },
      ],
      publishedAtEpochMillis: 0,
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
