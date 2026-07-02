// pages/index/index.js
const app = getApp()
const { callCloud, showToast } = require('../../utils/config.js')

const CLASS_INFO_CACHE_TTL = 5 * 60 * 1000 // 5 分钟缓存
let classInfoCache = null
let classInfoCacheTime = 0

Page({
  data: {
    classInfo: {},
    yearsSince: 0,
    carouselPhotos: [],
    carouselLoading: true
  },

  onLoad() {
    this.loadClassInfo()
    this.loadCarouselPhotos()
  },

  onShow() {
    // 5 分钟内复用本地缓存，避免每次切回来都打云函数
    this.loadClassInfo(true)
    // 每次回到首页都刷新轮播，确保精选照片能立即显示
    this.loadCarouselPhotos()
  },

  async loadClassInfo(useCache = true) {
    // 命中缓存则直接使用，不再请求云端
    if (useCache && classInfoCache && (Date.now() - classInfoCacheTime) < CLASS_INFO_CACHE_TTL) {
      this.setData({
        classInfo: classInfoCache,
        yearsSince: this.calculateYearsSince(classInfoCache.year)
      })
      return
    }

    try {
      const res = await callCloud('getClassInfo')
      if (res.success && res.data) {
        classInfoCache = res.data
        classInfoCacheTime = Date.now()
        this.setData({
          classInfo: res.data,
          yearsSince: this.calculateYearsSince(res.data.year)
        })
      } else {
        const fallback = app.globalData.classInfo
        this.setData({
          classInfo: fallback,
          yearsSince: this.calculateYearsSince(fallback.year)
        })
      }
    } catch (err) {
      console.error('加载班级信息失败', err)
      const fallback = app.globalData.classInfo
      this.setData({
        classInfo: fallback,
        yearsSince: this.calculateYearsSince(fallback.year)
      })
    }
  },

  // 计算同窗多少年
  calculateYearsSince(year) {
    if (!year) return 0
    const yearNum = parseInt(year, 10)
    if (isNaN(yearNum)) return 0
    const currentYear = new Date().getFullYear()
    return currentYear - yearNum
  },

  // 加载轮播照片（只加载管理员标记的精选照片）
  async loadCarouselPhotos() {
    this.setData({ carouselLoading: true })
    try {
      const res = await callCloud('getMediaList', {
        type: 'photo',
        featuredOnly: true
      })
      if (res.success && Array.isArray(res.data)) {
        this.setData({
          carouselPhotos: res.data,
          carouselLoading: false
        })
      } else {
        this.setData({
          carouselPhotos: [],
          carouselLoading: false
        })
      }
    } catch (err) {
      console.error('加载轮播照片失败', err)
      this.setData({
        carouselPhotos: [],
        carouselLoading: false
      })
    }
  },

  onTapPhotos() {
    wx.switchTab({ url: '/pages/photos/photos' })
  },

  // 复制备案号
  onTapIcp() {
    wx.setClipboardData({
      data: '苏ICP备2026044365号-1X',
      success: () => showToast('备案号已复制', 'success')
    })
  },

  onTapIcpMain() {
    wx.setClipboardData({
      data: '苏ICP备2026044365号',
      success: () => showToast('主备案号已复制', 'success')
    })
  },

  onTapVideos() {
    wx.switchTab({ url: '/pages/videos/videos' })
  },

  onTapAbout() {
    wx.switchTab({ url: '/pages/about/about' })
  },

  // 点击轮播图跳转到照片墙
  onTapCarousel() {
    wx.switchTab({ url: '/pages/photos/photos' })
  }
})