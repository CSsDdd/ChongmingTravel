const {
  CoordinateSystem,
  createCheckpointVersion,
} = require('../models/checkpoint')

module.exports = [
  createCheckpointVersion({
    checkpointId: 'sample_birdwatching_deck',
    version: 1,
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
