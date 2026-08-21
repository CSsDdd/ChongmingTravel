const routeRepository = require('../../../repositories/route-repository')
const checkpointRepository = require('../../../repositories/checkpoint-repository')
const {
  RouteDraftReviewStatus,
  RouteTrafficMode,
  createRouteStop,
} = require('../../../models/route')
const {
  resolveImageUrl,
  saveLocalFile,
} = require('../../../utils/local-media')

const TRAFFIC_MODE_LABELS = {
  WALKING: '步行',
  CYCLING: '骑行',
  DRIVING: '驾车',
  PUBLIC_TRANSIT: '公共交通',
  OTHER: '其他方式',
}

const TRAFFIC_OPTIONS = [
  { label: '未选择', value: null },
  { label: '步行', value: RouteTrafficMode.WALKING },
  { label: '骑行', value: RouteTrafficMode.CYCLING },
  { label: '驾车', value: RouteTrafficMode.DRIVING },
  { label: '公共交通', value: RouteTrafficMode.PUBLIC_TRANSIT },
  { label: '其他方式', value: RouteTrafficMode.OTHER },
]

let editorStopSequence = 0

function createEditorStopId() {
  editorStopSequence += 1
  return `editor-stop-${Date.now()}-${editorStopSequence}`
}

function createEmptyDragState() {
  return {
    active: false,
    editorStopId: '',
    sourceIndex: -1,
    targetIndex: -1,
    previewTop: 0,
    previewLeft: 0,
    previewWidth: 0,
    previewHeight: 0,
    indicatorTop: 0,
    previewStop: null,
  }
}

function getLayoutData() {
  const windowInfo = wx.getWindowInfo
    ? wx.getWindowInfo()
    : wx.getSystemInfoSync()
  const statusBarHeight = windowInfo.statusBarHeight || 20
  const menuButton = wx.getMenuButtonBoundingClientRect
    ? wx.getMenuButtonBoundingClientRect()
    : null
  const navigationBarHeight = menuButton
    ? (menuButton.top - statusBarHeight) * 2 + menuButton.height
    : 52
  const toolbarRightInset = menuButton
    ? windowInfo.windowWidth - menuButton.left + 8
    : 12
  return {
    statusBarHeight,
    navigationBarHeight,
    toolbarRightInset,
    contentTop: statusBarHeight + navigationBarHeight,
  }
}

function createStopView(stop, index) {
  const editorStopId = stop.editorStopId || createEditorStopId()
  const trafficOptionIndex = Math.max(
    0,
    TRAFFIC_OPTIONS.findIndex(option => option.value === stop.trafficToNext)
  )
  return {
    ...stop,
    editorStopId,
    viewKey: editorStopId,
    orderLabel: String(index + 1).padStart(2, '0'),
    title: stop.title || stop.checkpointId,
    imageUrl: resolveImageUrl(stop.imageUrl || stop.imageId),
    trafficOptionIndex,
    trafficToNextLabel: TRAFFIC_MODE_LABELS[stop.trafficToNext]
      || '选择交通方式',
  }
}

async function hydrateStop(stop) {
  try {
    const checkpoint = await checkpointRepository.findVersion(
      stop.checkpointId,
      stop.checkpointVersion
    )
    return checkpoint
      ? {
        ...stop,
        title: checkpoint.title,
        imageId: checkpoint.imageId,
      }
      : stop
  } catch (error) {
    return stop
  }
}

async function createHydratedStopViews(stops) {
  const hydratedStops = await Promise.all(stops.map(hydrateStop))
  return hydratedStops.map(createStopView)
}

function calculateDropTarget(previewCenterY, rects, sourceIndex) {
  const remainingRects = rects.filter((_, index) => index !== sourceIndex)
  let targetIndex = remainingRects.findIndex(rect => (
    previewCenterY < rect.top + rect.height / 2
  ))
  if (targetIndex < 0) {
    targetIndex = remainingRects.length
  }
  const previousRect = remainingRects[targetIndex - 1]
  const nextRect = remainingRects[targetIndex]
  const indicatorTop = previousRect && nextRect
    ? (previousRect.bottom + nextRect.top) / 2
    : previousRect
      ? previousRect.bottom + 8
      : nextRect.top - 8
  return { targetIndex, indicatorTop }
}

function createTrafficByEdge(stops) {
  const trafficByEdge = new Map()
  stops.slice(0, -1).forEach((stop, index) => {
    const nextStop = stops[index + 1]
    trafficByEdge.set(
      `${stop.editorStopId}->${nextStop.editorStopId}`,
      stop.trafficToNext
    )
  })
  return trafficByEdge
}

function restoreTrafficByEdge(stops, trafficByEdge) {
  return stops.map((stop, index) => {
    const nextStop = stops[index + 1]
    const edgeKey = nextStop
      ? `${stop.editorStopId}->${nextStop.editorStopId}`
      : ''
    return {
      ...stop,
      trafficToNext: nextStop && trafficByEdge.has(edgeKey)
        ? trafficByEdge.get(edgeKey)
        : null,
    }
  })
}

function createEditableSnapshot(data) {
  return JSON.stringify({
    title: data.title,
    description: data.description,
    note: data.note,
    coverImageId: data.coverImageId,
    tagTextInput: data.tagTextInput,
    stops: data.stops.map(stop => ({
      checkpointId: stop.checkpointId,
      checkpointVersion: stop.checkpointVersion,
      note: stop.note,
      trafficToNext: stop.trafficToNext,
    })),
  })
}

function normalizeTagIds(tagTextInput) {
  return [...new Set(tagTextInput
    .split(/[,，\s]+/)
    .map(value => value.trim().replace(/^#/, ''))
    .filter(Boolean))]
}

Page({
  data: {
    ...getLayoutData(),
    routeId: '',
    version: 1,
    title: '',
    description: '',
    note: '',
    coverImageId: '',
    coverImageUrl: '',
    tagTextInput: '',
    stops: [],
    reviewStatus: RouteDraftReviewStatus.NOT_SUBMITTED,
    isReadOnly: false,
    isLoading: true,
    isSaving: false,
    isSubmitting: false,
    trafficOptions: TRAFFIC_OPTIONS,
    dragState: createEmptyDragState(),
  },

  async onLoad(options) {
    const routeId = options.routeId
      ? decodeURIComponent(options.routeId)
      : ''
    if (!routeId) {
      this.setData({ isLoading: false }, () => this.rememberSavedState())
      return
    }
    await this.loadDraft(routeId)
  },

  async loadDraft(routeId) {
    try {
      const draft = await routeRepository.findDraft(routeId)
      if (!draft) {
        throw new Error('没有找到路线草稿')
      }
      await this.applyDraft(draft)
    } catch (error) {
      this.setData({ isLoading: false })
      wx.showToast({ title: error.message || '路线加载失败', icon: 'none' })
    }
  },

  async applyDraft(draft) {
    const isReadOnly = draft.reviewStatus === RouteDraftReviewStatus.IN_REVIEW
    const stops = await createHydratedStopViews(draft.stops)
    this.setData({
      routeId: draft.routeId,
      version: draft.version,
      title: draft.title,
      description: draft.description,
      note: draft.note,
      coverImageId: draft.coverImageId,
      coverImageUrl: resolveImageUrl(draft.coverImageId),
      tagTextInput: draft.tagIds.join('，'),
      stops,
      reviewStatus: draft.reviewStatus,
      isReadOnly,
      isLoading: false,
    }, () => this.rememberSavedState())
  },

  onFieldInput(event) {
    const field = event.currentTarget.dataset.field
    if (!field || this.data.isReadOnly) {
      return
    }
    this.setData({ [field]: event.detail.value }, () => this.updateUnsavedWarning())
  },

  onStopNoteInput(event) {
    const index = Number(event.currentTarget.dataset.index)
    if (!Number.isInteger(index) || this.data.isReadOnly) {
      return
    }
    this.setData({
      [`stops[${index}].note`]: event.detail.value,
    }, () => this.updateUnsavedWarning())
  },

  onStopImageError(event) {
    const index = Number(event.currentTarget.dataset.index)
    if (!Number.isInteger(index)) {
      return
    }
    this.setData({ [`stops[${index}].imageUrl`]: '' })
  },

  async chooseCover() {
    if (this.data.isReadOnly) {
      return
    }
    try {
      const result = await wx.chooseMedia({ count: 1, mediaType: ['image'] })
      const selectedFile = result.tempFiles && result.tempFiles[0]
      if (!selectedFile) {
        return
      }
      const coverImageId = await saveLocalFile(
        selectedFile.tempFilePath || selectedFile.path
      )
      this.setData({
        coverImageId,
        coverImageUrl: resolveImageUrl(coverImageId),
      }, () => this.updateUnsavedWarning())
    } catch (error) {
      if (!String(error.errMsg || error.message).includes('cancel')) {
        wx.showToast({ title: error.message || '封面选择失败', icon: 'none' })
      }
    }
  },

  openCheckpointPicker(event) {
    const insertIndex = Number(event.currentTarget.dataset.index)
    if (!Number.isInteger(insertIndex) || this.data.isReadOnly) {
      return
    }
    wx.navigateTo({
      url: '/pages/checkpoint/picker/checkpoint-picker',
      events: {
        checkpointSelected: checkpoint => {
          this.insertStopAt(insertIndex, checkpoint)
        },
      },
    })
  },

  async insertStopAt(insertIndex, checkpoint) {
    try {
      const stops = this.data.stops.map(stop => ({ ...stop }))
      const safeIndex = Math.max(0, Math.min(insertIndex, stops.length))
      const routeStop = createRouteStop({
        checkpointId: checkpoint.id,
        checkpointVersion: Number(checkpoint.version),
        note: '',
        trafficToNext: null,
      })
      const hydratedStop = await hydrateStop(routeStop)
      stops.splice(safeIndex, 0, hydratedStop)
      this.setData({
        stops: stops.map(createStopView),
      }, () => this.updateUnsavedWarning())
    } catch (error) {
      wx.showToast({ title: error.message || '打卡点插入失败', icon: 'none' })
    }
  },

  getStopIndex(editorStopId) {
    return this.data.stops.findIndex(
      stop => stop.editorStopId === editorStopId
    )
  },

  measureStopRects() {
    return new Promise(resolve => {
      wx.createSelectorQuery()
        .selectAll('.stop-card')
        .boundingClientRect(rects => resolve(rects || []))
        .exec()
    })
  },

  async startStopDrag(event) {
    const editorStopId = event.currentTarget.dataset.stopId
    const touch = event.touches && event.touches[0]
    if (!touch || this.data.isReadOnly || this.data.stops.length < 2) {
      return
    }
    this.dragTouchActive = true
    const rects = await this.measureStopRects()
    const sourceIndex = this.getStopIndex(editorStopId)
    const sourceRect = rects[sourceIndex]
    if (!this.dragTouchActive || !sourceRect) {
      return
    }
    this.dragStopRects = rects
    this.dragPointerOffsetY = touch.clientY - sourceRect.top
    const dropTarget = calculateDropTarget(
      sourceRect.top + sourceRect.height / 2,
      rects,
      sourceIndex
    )
    this.setData({
      dragState: {
        active: true,
        editorStopId,
        sourceIndex,
        ...dropTarget,
        previewTop: sourceRect.top,
        previewLeft: sourceRect.left,
        previewWidth: sourceRect.width,
        previewHeight: sourceRect.height,
        previewStop: this.data.stops[sourceIndex],
      },
    })
  },

  moveStopDrag(event) {
    const touch = event.touches && event.touches[0]
    if (!touch || !this.data.dragState.active) {
      return
    }
    const now = Date.now()
    if (this.lastDragUpdateAt && now - this.lastDragUpdateAt < 16) {
      return
    }
    this.lastDragUpdateAt = now
    const previewTop = touch.clientY - this.dragPointerOffsetY
    const previewCenterY = previewTop + this.data.dragState.previewHeight / 2
    const dropTarget = calculateDropTarget(
      previewCenterY,
      this.dragStopRects,
      this.data.dragState.sourceIndex
    )
    this.setData({
      'dragState.previewTop': previewTop,
      'dragState.targetIndex': dropTarget.targetIndex,
      'dragState.indicatorTop': dropTarget.indicatorTop,
    })
  },

  endStopDrag() {
    this.dragTouchActive = false
    const { active, editorStopId, targetIndex } = this.data.dragState
    if (!active) {
      return
    }
    this.moveStop(editorStopId, targetIndex)
  },

  cancelStopDrag() {
    this.dragTouchActive = false
    this.clearDragRuntime()
    this.setData({ dragState: createEmptyDragState() })
  },

  moveStop(editorStopId, targetIndex) {
    const sourceIndex = this.getStopIndex(editorStopId)
    const stops = this.data.stops.map(stop => ({ ...stop }))
    if (sourceIndex < 0 || !Number.isInteger(targetIndex)) {
      this.cancelStopDrag()
      return
    }
    if (sourceIndex === targetIndex) {
      this.cancelStopDrag()
      return
    }
    const trafficByEdge = createTrafficByEdge(stops)
    const [movedStop] = stops.splice(sourceIndex, 1)
    const safeTargetIndex = Math.max(0, Math.min(targetIndex, stops.length))
    stops.splice(safeTargetIndex, 0, movedStop)
    const reorderedStops = restoreTrafficByEdge(stops, trafficByEdge)
    this.clearDragRuntime()
    this.setData({
      stops: reorderedStops.map(createStopView),
      dragState: createEmptyDragState(),
    }, () => this.updateUnsavedWarning())
  },

  clearDragRuntime() {
    this.dragStopRects = null
    this.dragPointerOffsetY = 0
    this.lastDragUpdateAt = 0
  },

  async confirmRemoveStop(event) {
    const editorStopId = event.currentTarget.dataset.stopId
    const index = this.getStopIndex(editorStopId)
    if (index < 0 || this.data.isReadOnly) {
      return
    }
    const result = await wx.showModal({
      title: '移除路线节点',
      content: `确定从路线中移除“${this.data.stops[index].title}”吗？`,
      confirmText: '移除',
      confirmColor: '#b5443b',
    })
    if (result.confirm) {
      this.removeStop(editorStopId)
    }
  },

  removeStop(editorStopId) {
    const index = this.getStopIndex(editorStopId)
    if (index < 0) {
      return
    }
    const stops = this.data.stops.map(stop => ({ ...stop }))
    const trafficByEdge = createTrafficByEdge(stops)
    stops.splice(index, 1)
    const remainingStops = restoreTrafficByEdge(stops, trafficByEdge)
    this.setData({
      stops: remainingStops.map(createStopView),
    }, () => this.updateUnsavedWarning())
  },

  onTrafficChange(event) {
    const stopIndex = Number(event.currentTarget.dataset.index)
    const optionIndex = Number(event.detail.value)
    const option = this.data.trafficOptions[optionIndex]
    if (!option || stopIndex < 0 || stopIndex >= this.data.stops.length - 1) {
      return
    }
    this.setData({
      [`stops[${stopIndex}].trafficToNext`]: option.value,
      [`stops[${stopIndex}].trafficToNextLabel`]: option.label,
      [`stops[${stopIndex}].trafficOptionIndex`]: optionIndex,
    }, () => this.updateUnsavedWarning())
  },

  createRouteInput() {
    const title = this.data.title.trim()
    const description = this.data.description.trim()
    if (!title || !description) {
      throw new Error('请填写路线标题和简介')
    }
    const input = {
      title,
      description,
      note: this.data.note.trim(),
      coverImageId: this.data.coverImageId.trim(),
      tagIds: normalizeTagIds(this.data.tagTextInput),
      stops: this.data.stops.map(stop => ({
        checkpointId: stop.checkpointId,
        checkpointVersion: stop.checkpointVersion,
        note: stop.note.trim(),
        trafficToNext: stop.trafficToNext,
      })),
    }
    if (this.data.routeId) {
      input.routeId = this.data.routeId
    }
    return input
  },

  async saveRoute() {
    if (this.data.isSaving || this.data.isSubmitting || this.data.isReadOnly) {
      return
    }
    this.setData({ isSaving: true })
    try {
      const savedDraft = await routeRepository.update(this.createRouteInput())
      this.hasUnsavedChanges = false
      wx.disableAlertBeforeUnload()
      this.setData({
        routeId: savedDraft.routeId,
        version: savedDraft.version,
        title: savedDraft.title,
        description: savedDraft.description,
        note: savedDraft.note,
        tagTextInput: savedDraft.tagIds.join('，'),
      }, () => this.rememberSavedState())
      wx.showToast({ title: '路线草稿已保存', icon: 'success' })
    } catch (error) {
      wx.showToast({ title: error.message || '路线保存失败', icon: 'none' })
    } finally {
      this.setData({ isSaving: false })
    }
  },

  async toggleReview() {
    if (this.data.isSaving || this.data.isSubmitting) {
      return
    }
    if (!this.data.routeId) {
      wx.showToast({ title: '请先保存路线草稿', icon: 'none' })
      return
    }
    if (this.hasUnsavedChanges) {
      wx.showToast({ title: '请先保存当前修改', icon: 'none' })
      return
    }
    if (this.data.reviewStatus !== RouteDraftReviewStatus.IN_REVIEW
      && this.data.stops.length < 2) {
      wx.showToast({ title: '路线至少需要两个打卡点', icon: 'none' })
      return
    }
    this.setData({ isSubmitting: true })
    try {
      const isInReview = this.data.reviewStatus === RouteDraftReviewStatus.IN_REVIEW
      if (isInReview) {
        await this.withdrawRouteReview()
      } else {
        await this.submitAndApproveRoute()
      }
    } catch (error) {
      wx.showToast({ title: error.message || '审核状态更新失败', icon: 'none' })
    } finally {
      this.setData({ isSubmitting: false })
    }
  },

  async withdrawRouteReview() {
    const draft = await routeRepository.withdrawDraftReview(this.data.routeId)
    await this.applyDraft(draft)
    wx.showToast({ title: '已撤回审核', icon: 'success' })
  },

  async submitAndApproveRoute() {
    const submittedDraft = await routeRepository.submitDraftForReview(
      this.data.routeId
    )
    try {
      // LOCAL DEMO：模拟审核固定通过；接入服务端审核后删除客户端审批调用。
      const approvalResult = await routeRepository.approveDraft(this.data.routeId)
      await this.applyDraft(approvalResult.nextDraftVersion)
      wx.showToast({ title: '已通过审核并发布', icon: 'success' })
    } catch (error) {
      await this.applyDraft(submittedDraft)
      throw error
    }
  },

  rememberSavedState() {
    this.savedSnapshot = createEditableSnapshot(this.data)
    this.hasUnsavedChanges = false
  },

  updateUnsavedWarning() {
    const hasChanges = createEditableSnapshot(this.data) !== this.savedSnapshot
    if (hasChanges === this.hasUnsavedChanges) {
      return
    }
    this.hasUnsavedChanges = hasChanges
    if (hasChanges) {
      wx.enableAlertBeforeUnload({ message: '路线草稿尚未保存，确定离开吗？' })
    } else {
      wx.disableAlertBeforeUnload()
    }
  },

  goBack() {
    wx.navigateBack()
  },
})
