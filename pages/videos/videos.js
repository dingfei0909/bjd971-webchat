// pages/videos/videos.js
const app = getApp()
const { callCloud, showLoading, hideLoading, showToast, checkSaveAuth, downloadAndSave, formatDateTime } = require('../../utils/config.js')

Page({
  data: {
    videos: [],
    loading: true,
    isAdmin: false,
    showUploadModal: false,
    uploadPassword: '',
    uploaderName: '',
    showPlayer: false,
    currentVideo: {}
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
    this.loadVideos()
    this.setData({ isAdmin: app.globalData.isAdmin })
  },

  onPullDownRefresh() {
    this.loadVideos().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  async loadVideos() {
    this.setData({ loading: true })
    try {
      const res = await callCloud('getMediaList', { type: 'video' })
      if (res.success && Array.isArray(res.data)) {
        const videos = res.data.map(function (v) {
          let format = 'MP4'
          if (v.url) {
            const match = v.url.match(/\.(\w+)(?:\?|$)/)
            if (match) {
              format = match[1].toUpperCase()
              if (format.length > 4) format = format.substring(0, 4)
            }
          }
          return {
            _id: v._id,
            type: v.type,
            url: v.url,
            description: v.description,
            size: v.size,
            duration: v.duration,
            createdAt: v.createdAt ? formatDateTime(v.createdAt) : '',
            playUrl: v.url,
            format: format,
            uploaderName: v.uploaderName || '匿名同学',
            featured: v.featured || false,
            featuredAt: v.featuredAt || null
          }
        })

        // 把 cloud:// 转成 https:// 临时链接（video 组件只认 https）
        const cloudFileIDs = videos
          .filter(function (v) { return v.url && v.url.startsWith('cloud://') })
          .map(function (v) { return v.url })

        if (cloudFileIDs.length > 0) {
          try {
            const tempRes = await wx.cloud.getTempFileURL({ fileList: cloudFileIDs })
            if (tempRes && tempRes.fileList) {
              tempRes.fileList.forEach(function (item) {
                videos.forEach(function (v) {
                  if (v.url === item.fileID && item.tempFileURL) {
                    v.playUrl = item.tempFileURL
                  }
                })
              })
            }
          } catch (err) {
            console.warn('获取临时链接失败：', err)
          }
        }

        this.setData({ videos: videos, loading: false })
      } else {
        this.setData({ videos: [], loading: false })
      }
    } catch (err) {
      console.error('加载视频失败', err)
      this.setData({ videos: [], loading: false })
    }
  },

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

  // 空函数：用于 catchtap/catchtouchmove 阻止事件冒泡和穿透
  onNoop() {},

  onCloseUploadModal() {
    this.setData({ showUploadModal: false })
  },

  async onConfirmUpload() {
    const password = this.data.uploadPassword
    const uploaderName = (this.data.uploaderName || '').trim()

    if (!uploaderName) {
      wx.showToast({ title: '请输入您的姓名', icon: 'none' })
      return
    }
    if (password !== app.globalData.uploadPassword) {
      wx.showToast({ title: '密码错误', icon: 'none' })
      return
    }

    // 保存姓名到本地，下次自动填入
    wx.setStorageSync('uploaderName', uploaderName)
    app.globalData.uploaderName = uploaderName

    this.setData({ showUploadModal: false })

    try {
      const chooseRes = await new Promise(function (resolve, reject) {
        wx.chooseMedia({
          count: 1,
          mediaType: ['video'],
          sourceType: ['album', 'camera'],
          maxDuration: 60,
          camera: 'back',
          success: resolve,
          fail: reject
        })
      })

      const files = chooseRes.tempFiles || []
      if (files.length === 0) return

      const file = files[0]

      if (file.size > 100 * 1024 * 1024) {
        wx.showToast({ title: '视频不能超过100MB', icon: 'none' })
        return
      }

      showLoading('上传中...')

      // 用 .mp4 固定后缀，避免 iOS 上传 mov 等导致云存储识别问题
      const fileId = Date.now() + '-' + Math.random().toString(36).slice(2, 8)
      const cloudPath = 'videos/' + fileId + '.mp4'

      // 上传视频
      const uploadRes = await new Promise(function (resolve, reject) {
        wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: file.tempFilePath,
          success: resolve,
          fail: reject
        })
      })

      // 保存到数据库
      await callCloud('addMedia', {
        type: 'video',
        url: uploadRes.fileID,
        size: file.size,
        duration: file.duration ? Math.round(file.duration) + 's' : '',
        description: '',
        uploaderName: uploaderName || '匿名同学'
      })

      hideLoading()
      showToast('上传成功', 'success')
      this.loadVideos()
    } catch (err) {
      hideLoading()
      console.error('上传失败', err)
      if (err && err.errMsg && !err.errMsg.includes('cancel')) {
        showToast('上传失败', 'none')
      }
    }
  },

  onTapVideo(e) {
    const id = e.currentTarget.dataset.id
    const video = this.data.videos.find(function (v) { return v._id === id })
    if (!video) return

    // 暂停所有封面视频
    this.data.videos.forEach(function (v) {
      const ctx = wx.createVideoContext('cover-' + v._id)
      if (ctx) ctx.pause()
    })

    this.setData({
      showPlayer: true,
      currentVideo: video
    })
  },

  onClosePlayer() {
    this.setData({ showPlayer: false, currentVideo: {} })
  },

  onVideoError(e) {
    console.error('视频播放错误：', e.detail)
  },

  onPlayerError(e) {
    console.error('播放器视频错误：', e.detail)
  },

  // 切换置顶状态（仅管理员，最多6个置顶）
  async onToggleFeatured() {
    if (!this.data.isAdmin) {
      showToast('仅管理员可操作', 'none')
      return
    }

    const { currentVideo } = this.data
    const newFeatured = !currentVideo.featured

    showLoading(newFeatured ? '设置置顶...' : '取消置顶...')
    try {
      const res = await callCloud('toggleFeatured', {
        id: currentVideo._id,
        type: 'video',
        featured: newFeatured,
        password: app.globalData.adminPassword
      })
      hideLoading()
      if (res.success) {
        // 更新本地预览数据
        this.setData({
          currentVideo: { ...currentVideo, featured: newFeatured }
        })
        showToast(newFeatured ? '已置顶' : '已取消置顶', 'success')
        // 刷新列表
        this.loadVideos()
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

  async onDownload(e) {
    const id = e.currentTarget.dataset.id
    const video = this.data.videos.find(function (v) { return v._id === id })
    if (!video) return

    try {
      const hasAuth = await checkSaveAuth()
      if (!hasAuth) return
      await downloadAndSave(video.url)
    } catch (err) {
      console.error('下载失败', err)
    }
  },

  async onDelete(e) {
    if (!this.data.isAdmin) {
      showToast('仅管理员可删除', 'none')
      return
    }

    const id = e.currentTarget.dataset.id

    const confirm = await new Promise(function (resolve) {
      wx.showModal({
        title: '确认删除',
        content: '确定要删除这个视频吗？删除后不可恢复',
        confirmText: '删除',
        confirmColor: '#FF3B30',
        success: function (res) { resolve(res.confirm) }
      })
    })

    if (!confirm) return

    showLoading('删除中...')
    try {
      const res = await callCloud('deleteMedia', {
        id: id,
        password: app.globalData.adminPassword
      })
      hideLoading()
      if (res.success) {
        showToast('删除成功', 'success')
        this.loadVideos()
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