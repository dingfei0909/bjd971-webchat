// pages/photos/photos.js
const app = getApp()
const { callCloud, showLoading, hideLoading, showToast, checkSaveAuth, downloadAndSave, formatDateTime, copyText } = require('../../utils/config.js')

Page({
  data: {
    photos: [],
    loading: true,
    isAdmin: false,
    showUploadModal: false,
    uploadPassword: '',
    uploaderName: '',
    showPreview: false,
    previewPhoto: {}
  },

  onLoad() {
    this.setData({ isAdmin: app.globalData.isAdmin })
    // 从本地存储读取之前保存的姓名
    const savedName = wx.getStorageSync('uploaderName')
    if (savedName) {
      this.setData({ uploaderName: savedName })
    }
  },

  onShow() {
    this.loadPhotos()
    this.setData({ isAdmin: app.globalData.isAdmin })
  },

  onPullDownRefresh() {
    this.loadPhotos().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  async loadPhotos() {
    this.setData({ loading: true })
    try {
      const res = await callCloud('getMediaList', { type: 'photo' })
      if (res.success) {
        // 格式化日期
        const photos = (res.data || []).map(p => ({
          ...p,
          featured: p.featured || false,
          createdAt: p.createdAt ? formatDateTime(p.createdAt) : '',
          uploaderName: p.uploaderName || '匿名同学'
        }))
        this.setData({ photos, loading: false })
      } else {
        this.setData({ photos: [], loading: false })
      }
    } catch (err) {
      console.error('加载照片失败', err)
      this.setData({ photos: [], loading: false })
    }
  },

  // 点击上传
  onTapUpload() {
    this.setData({
      showUploadModal: true,
      uploadPassword: ''
    })
  },

  onInputPassword(e) {
    this.setData({ uploadPassword: e.detail.value })
  },

  onInputUploaderName(e) {
    this.setData({ uploaderName: e.detail.value })
  },

  onCloseUploadModal() {
    this.setData({ showUploadModal: false })
  },

  // 空函数：用于 catchtap/catchtouchmove 阻止事件冒泡和穿透
  onNoop() {},

  async onConfirmUpload() {
    const { uploadPassword, uploaderName } = this.data
    const trimmedName = (uploaderName || '').trim()

    if (!trimmedName) {
      wx.showToast({ title: '请输入您的姓名', icon: 'none' })
      return
    }
    if (uploadPassword !== app.globalData.uploadPassword) {
      wx.showToast({ title: '密码错误', icon: 'none' })
      return
    }

    // 保存姓名到本地
    wx.setStorageSync('uploaderName', trimmedName)
    app.globalData.uploaderName = trimmedName

    this.setData({ showUploadModal: false })

    // 选择图片
    try {
      const chooseRes = await new Promise((resolve, reject) => {
        wx.chooseMedia({
          count: 9,
          mediaType: ['image'],
          sourceType: ['album', 'camera'],
          sizeType: ['compressed'],
          camera: 'back',
          success: resolve,
          fail: reject
        })
      })

      const files = chooseRes.tempFiles || []
      if (files.length === 0) return

      showLoading('上传中...')

      for (const file of files) {
        // 获取后缀
        const ext = (file.tempFilePath.match(/\.(\w+)$/) || ['', 'jpg'])[1]
        const cloudPath = `photos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

        const uploadRes = await new Promise((resolve, reject) => {
          wx.cloud.uploadFile({
            cloudPath,
            filePath: file.tempFilePath,
            success: resolve,
            fail: reject
          })
        })

        // 保存到数据库
        await callCloud('addMedia', {
          type: 'photo',
          url: uploadRes.fileID,
          size: file.size,
          description: '',
          uploaderName: app.globalData.uploaderName || '匿名同学'
        })
      }

      hideLoading()
      showToast('上传成功', 'success')
      this.loadPhotos()
    } catch (err) {
      hideLoading()
      console.error('上传失败', err)
      if (err && err.errMsg && !err.errMsg.includes('cancel')) {
        showToast('上传失败', 'none')
      }
    }
  },

  // 点击照片预览
  onTapPhoto(e) {
    const { id } = e.currentTarget.dataset
    const photo = this.data.photos.find(p => p._id === id)
    if (photo) {
      this.setData({
        showPreview: true,
        previewPhoto: photo
      })
    }
  },

  onClosePreview() {
    this.setData({ showPreview: false })
  },

  // 切换置顶状态（仅管理员，最多6个置顶）
  async onToggleFeatured() {
    if (!this.data.isAdmin) {
      showToast('仅管理员可操作', 'none')
      return
    }

    const { previewPhoto } = this.data
    const newFeatured = !previewPhoto.featured

    showLoading(newFeatured ? '设置置顶...' : '取消置顶...')
    try {
      const res = await callCloud('toggleFeatured', {
        id: previewPhoto._id,
        featured: newFeatured,
        password: app.globalData.adminPassword
      })
      hideLoading()
      if (res.success) {
        // 更新本地预览数据
        this.setData({
          previewPhoto: { ...previewPhoto, featured: newFeatured }
        })
        showToast(newFeatured ? '已置顶' : '已取消置顶', 'success')
        // 刷新列表
        this.loadPhotos()
      } else {
        // 显示后端返回的具体错误（如"置顶数量已达上限"）
        showToast(res.message || '操作失败', 'none')
      }
    } catch (err) {
      hideLoading()
      console.error('切换置顶失败', err)
      showToast('操作失败', 'none')
    }
  },

  // 下载到相册
  async onDownload() {
    const { previewPhoto } = this.data
    try {
      const hasAuth = await checkSaveAuth()
      if (!hasAuth) return
      await downloadAndSave(previewPhoto.url)
    } catch (err) {
      console.error('下载失败', err)
    }
  },

  // 分享 - 复制链接
  onShare() {
    const { previewPhoto } = this.data
    copyText(previewPhoto.url, '链接已复制')
  },

  // 删除（仅管理员）
  async onDelete() {
    if (!this.data.isAdmin) {
      showToast('仅管理员可删除', 'none')
      return
    }

    const { previewPhoto } = this.data

    const confirm = await new Promise(resolve => {
      wx.showModal({
        title: '确认删除',
        content: '确定要删除这张照片吗？删除后不可恢复',
        confirmText: '删除',
        confirmColor: '#FF3B30',
        success: (res) => resolve(res.confirm)
      })
    })

    if (!confirm) return

    showLoading('删除中...')
    try {
      const res = await callCloud('deleteMedia', {
        id: previewPhoto._id,
        password: app.globalData.adminPassword
      })
      hideLoading()
      if (res.success) {
        showToast('删除成功', 'success')
        this.setData({ showPreview: false })
        this.loadPhotos()
      } else {
        showToast(res.message || '删除失败', 'none')
      }
    } catch (err) {
      hideLoading()
      console.error('删除失败', err)
      showToast('删除失败', 'none')
    }
  }
})