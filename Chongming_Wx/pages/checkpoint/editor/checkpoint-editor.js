const checkpointRepository = require('../../../repositories/checkpoint-repository')
const {
  CheckpointDraftReviewStatus,
  CoordinateSystem,
} = require('../../../models/checkpoint')
const { saveLocalFile } = require('../../../utils/local-media')

function createFormDraft(data) {
  return {
    title: data.title,
    shortText: data.shortText,
    imageId: data.imageId,
    tagTextInput: data.tagTextInput,
    locationName: data.locationName,
    latitude: data.latitude,
    longitude: data.longitude,
    coordinateSystem: data.coordinateSystem,
  }
}

function getCoordinateSystemLabel(value) {
  return value === CoordinateSystem.WGS84
    ? 'WGS-84'
    : 'GCJ-02（微信地图）'
}

function parseTags(value) {
  return String(value || '')
    .split(/[，,、]/)
    .map(tag => tag.trim())
    .filter((tag, index, tags) => tag && tags.indexOf(tag) === index)
}

Page({
  data: {
    mode: 'create',
    checkpointId: '',
    version: 1,
    reviewStatus: CheckpointDraftReviewStatus.NOT_SUBMITTED,
    reviewStatusLabel: '未提交审核',
    title: '',
    shortText: '',
    imageId: '',
    imagePreviewFailed: false,
    tagTextInput: '',
    locationName: '',
    latitude: '',
    longitude: '',
    coordinateSystem: CoordinateSystem.GCJ02,
    coordinateSystemLabel: getCoordinateSystemLabel(CoordinateSystem.GCJ02),
    isLoading: true,
    isSaving: false,
    isSubmitting: false,
    isDeleting: false,
  },

  async onLoad(options) {
    const checkpointId = options.checkpointId
      ? decodeURIComponent(options.checkpointId)
      : ''
    const mode = checkpointId ? 'edit' : 'create'
    wx.setNavigationBarTitle({
      title: mode === 'edit' ? '编辑打卡点草稿' : '新建打卡点',
    })

    if (!checkpointId) {
      this.setData({ mode, isLoading: false }, () => this.rememberInitialDraft())
      return
    }

    try {
      const draft = await checkpointRepository.findDraft(checkpointId)
      if (!draft) {
        throw new Error('没有找到对应的打卡点草稿')
      }
      this.setData({
        mode,
        checkpointId: draft.checkpointId,
        version: draft.version,
        reviewStatus: draft.reviewStatus,
        reviewStatusLabel: draft.reviewStatus === CheckpointDraftReviewStatus.IN_REVIEW
          ? '审核中'
          : '未提交审核',
        title: draft.title || '',
        shortText: draft.shortText || '',
        imageId: draft.imageId || '',
        imagePreviewFailed: false,
        tagTextInput: (draft.tagIds || []).join('，'),
        locationName: draft.location ? draft.location.locationName || '' : '',
        latitude: draft.location ? String(draft.location.latitude ?? '') : '',
        longitude: draft.location ? String(draft.location.longitude ?? '') : '',
        coordinateSystem: draft.location && draft.location.coordinateSystem
          ? draft.location.coordinateSystem
          : CoordinateSystem.GCJ02,
        coordinateSystemLabel: getCoordinateSystemLabel(
          draft.location && draft.location.coordinateSystem
        ),
        isLoading: false,
      }, () => this.rememberInitialDraft())
    } catch (error) {
      this.setData({ isLoading: false })
      wx.showToast({ title: error.message || '草稿加载失败', icon: 'none' })
    }
  },

  onUnload() {
    wx.disableAlertBeforeUnload()
  },

  onFieldInput(e) {
    if (this.data.reviewStatus === CheckpointDraftReviewStatus.IN_REVIEW) {
      return
    }
    const field = e.currentTarget.dataset.field
    this.setData({ [field]: e.detail.value }, () => this.updateUnsavedWarning())
  },

  async chooseCheckpointLocation() {
    if (this.data.reviewStatus === CheckpointDraftReviewStatus.IN_REVIEW) {
      wx.showToast({ title: '请先撤回审核请求', icon: 'none' })
      return
    }
    try {
      const location = await wx.chooseLocation()
      const locationName = String(location.name || location.address || '').trim()
      if (!locationName
        || !Number.isFinite(location.latitude)
        || !Number.isFinite(location.longitude)) {
        throw new Error('没有取得有效的地点信息')
      }

      this.setData({
        locationName,
        latitude: location.latitude,
        longitude: location.longitude,
        coordinateSystem: CoordinateSystem.GCJ02,
        coordinateSystemLabel: getCoordinateSystemLabel(CoordinateSystem.GCJ02),
      }, () => this.updateUnsavedWarning())
    } catch (error) {
      const message = String(error && (error.errMsg || error.message) || '')
      if (message.includes('cancel')) {
        return
      }
      wx.showToast({ title: error.message || '位置选择失败', icon: 'none' })
    }
  },

  async chooseCheckpointImage() {
    if (this.data.reviewStatus === CheckpointDraftReviewStatus.IN_REVIEW) {
      wx.showToast({ title: '请先撤回审核请求', icon: 'none' })
      return
    }
    try {
      const result = await wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        camera: 'back',
      })
      const selectedFile = result.tempFiles && result.tempFiles[0]
      const tempFilePath = selectedFile
        ? selectedFile.tempFilePath || selectedFile.path
        : ''
      if (!tempFilePath) {
        throw new Error('没有取得所选图片')
      }

      // 当前本地版本保存到小程序本地文件系统；接入后端后应改为上传文件，
      // 并将服务端返回的永久 imageId 写入草稿。
      const imageId = await saveLocalFile(tempFilePath)
      this.setData({
        imageId,
        imagePreviewFailed: false,
      }, () => this.updateUnsavedWarning())
    } catch (error) {
      if (error && String(error.errMsg || error.message).includes('cancel')) {
        return
      }
      wx.showToast({ title: error.message || '图片选择失败', icon: 'none' })
    }
  },

  previewCheckpointImage() {
    if (!this.data.imageId || this.data.imagePreviewFailed) {
      return
    }
    wx.previewImage({
      current: this.data.imageId,
      urls: [this.data.imageId],
    })
  },

  onImagePreviewError() {
    this.setData({ imagePreviewFailed: true })
  },

  rememberInitialDraft() {
    this.initialDraft = JSON.stringify(createFormDraft(this.data))
    this.hasUnsavedChanges = false
  },

  updateUnsavedWarning() {
    const hasChanges = JSON.stringify(createFormDraft(this.data)) !== this.initialDraft
    if (hasChanges === this.hasUnsavedChanges) {
      return
    }
    this.hasUnsavedChanges = hasChanges
    if (hasChanges) {
      wx.enableAlertBeforeUnload({ message: '草稿尚未保存，确定离开吗？' })
      return
    }
    wx.disableAlertBeforeUnload()
  },

  createCheckpointInput() {
    const title = this.data.title.trim()
    const locationName = this.data.locationName.trim()
    const latitudeText = String(this.data.latitude).trim()
    const longitudeText = String(this.data.longitude).trim()
    const latitude = Number(latitudeText)
    const longitude = Number(longitudeText)
    const tagIds = parseTags(this.data.tagTextInput)
    if (!title) {
      throw new Error('请填写打卡点标题')
    }
    if (!locationName) {
      throw new Error('请填写地点名称')
    }
    if (!latitudeText || !Number.isFinite(latitude)
      || latitude < -90 || latitude > 90) {
      throw new Error('纬度必须在 -90 到 90 之间')
    }
    if (!longitudeText || !Number.isFinite(longitude)
      || longitude < -180 || longitude > 180) {
      throw new Error('经度必须在 -180 到 180 之间')
    }
    if (!tagIds.length) {
      throw new Error('请至少填写一个标签')
    }

    const input = {
      location: {
        latitude,
        longitude,
        locationName,
        coordinateSystem: this.data.coordinateSystem,
      },
      title,
      shortText: this.data.shortText.trim(),
      imageId: this.data.imageId.trim(),
      tagIds,
    }
    if (this.data.checkpointId) {
      input.checkpointId = this.data.checkpointId
    }
    return input
  },

  async saveCheckpoint() {
    if (this.data.isSaving || this.data.isSubmitting || this.data.isDeleting) {
      return
    }
    if (this.data.reviewStatus === CheckpointDraftReviewStatus.IN_REVIEW) {
      wx.showToast({ title: '请先撤回审核请求', icon: 'none' })
      return
    }
    this.setData({ isSaving: true })
    try {
      const savedDraft = await checkpointRepository.update(
        this.createCheckpointInput()
      )
      this.hasUnsavedChanges = false
      wx.disableAlertBeforeUnload()
      this.setData({
        checkpointId: savedDraft.checkpointId,
        version: savedDraft.version,
      })
      wx.showToast({ title: '草稿已保存', icon: 'success' })
      wx.navigateBack()
    } catch (error) {
      wx.showToast({ title: error.message || '草稿保存失败', icon: 'none' })
    } finally {
      this.setData({ isSaving: false })
    }
  },

  async submitForReview() {
    if (this.data.isSaving || this.data.isSubmitting || this.data.isDeleting) {
      return
    }
    if (!this.data.checkpointId) {
      wx.showToast({ title: '请先保存草稿', icon: 'none' })
      return
    }
    if (this.hasUnsavedChanges) {
      wx.showToast({ title: '请先保存当前修改', icon: 'none' })
      return
    }
    if (this.data.reviewStatus === CheckpointDraftReviewStatus.IN_REVIEW) {
      this.setData({ isSubmitting: true })
      try {
        const withdrawnDraft = await checkpointRepository.withdrawDraftReview(
          this.data.checkpointId
        )
        this.setData({
          reviewStatus: withdrawnDraft.reviewStatus,
          reviewStatusLabel: '未提交审核',
        })
        wx.showToast({ title: '已撤回审核请求', icon: 'success' })
      } catch (error) {
        wx.showToast({ title: error.message || '撤回审核失败', icon: 'none' })
      } finally {
        this.setData({ isSubmitting: false })
      }
      return
    }

    this.setData({ isSubmitting: true })
    try {
      const submittedDraft = await checkpointRepository.submitDraftForReview(
        this.data.checkpointId
      )
      this.setData({
        reviewStatus: submittedDraft.reviewStatus,
        reviewStatusLabel: '审核中',
      })
      wx.showToast({ title: '已提交审核', icon: 'success' })

      // LOCAL DEMO TODO：当前使用模拟审核，所以提交后立即审批。
      // 接入真实审核服务后必须删除此客户端调用，改由服务端/审核端在审核完成时
      // 调用 approveDraft；客户端只提交请求并展示 IN_REVIEW 状态。
      const approvalResult = await checkpointRepository.approveDraft(
        this.data.checkpointId
      )
      this.setData({
        version: approvalResult.nextDraftVersion.version,
        reviewStatus: approvalResult.nextDraftVersion.reviewStatus,
        reviewStatusLabel: '未提交审核',
      })
    } catch (error) {
      wx.showToast({ title: error.message || '提交审核失败', icon: 'none' })
    } finally {
      this.setData({ isSubmitting: false })
    }
  },

  async deleteCheckpointDraft() {
    if (this.data.isSaving || this.data.isSubmitting || this.data.isDeleting) {
      return
    }
    if (!this.data.checkpointId) {
      wx.showToast({ title: '草稿尚未保存', icon: 'none' })
      return
    }
    if (this.data.reviewStatus === CheckpointDraftReviewStatus.IN_REVIEW) {
      wx.showToast({ title: '请先撤回审核请求', icon: 'none' })
      return
    }

    const result = await wx.showModal({
      title: '删除草稿',
      content: '删除后无法恢复；已经发布的正式版本不会受影响。',
      confirmText: '删除',
      confirmColor: '#b5443b',
    })
    if (!result.confirm) {
      return
    }

    this.setData({ isDeleting: true })
    try {
      await checkpointRepository.deleteDraft(this.data.checkpointId)
      this.hasUnsavedChanges = false
      wx.disableAlertBeforeUnload()
      wx.showToast({ title: '草稿已删除', icon: 'success' })
      wx.navigateBack()
    } catch (error) {
      wx.showToast({ title: error.message || '删除草稿失败', icon: 'none' })
    } finally {
      this.setData({ isDeleting: false })
    }
  },
})
