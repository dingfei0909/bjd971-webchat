// pages/about/about.js
const app = getApp()
const { callCloud, showLoading, hideLoading, showToast } = require('../../utils/config.js')

Page({
  data: {
    classInfo: {},
    isAdmin: false,
    showLoginModal: false,
    adminPassword: '',
    showEditModal: false,
    editForm: {}
  },

  onLoad() {
    this.setData({ isAdmin: app.globalData.isAdmin })
  },

  onShow() {
    this.loadClassInfo()
    this.setData({ isAdmin: app.globalData.isAdmin })
  },

  async loadClassInfo() {
    try {
      const res = await callCloud('getClassInfo')
      if (res.success && res.data) {
        this.setData({ classInfo: res.data })
      } else {
        this.setData({ classInfo: app.globalData.classInfo })
      }
    } catch (err) {
      console.error('加载班级信息失败', err)
      this.setData({ classInfo: app.globalData.classInfo })
    }
  },

  // 管理员登录
  onAdminAction() {
    this.setData({ showLoginModal: true, adminPassword: '' })
  },

  onInputAdminPassword(e) {
    this.setData({ adminPassword: e.detail.value })
  },

  onCloseLoginModal() {
    this.setData({ showLoginModal: false })
  },

  onConfirmLogin() {
    const { adminPassword } = this.data
    if (adminPassword === app.globalData.adminPassword) {
      app.globalData.isAdmin = true
      this.setData({
        isAdmin: true,
        showLoginModal: false
      })
      showToast('登录成功', 'success')
    } else {
      showToast('密码错误', 'none')
    }
  },

  // 退出登录
  onLogout() {
    app.globalData.isAdmin = false
    this.setData({ isAdmin: false })
    showToast('已退出登录')
  },

  // 空函数，用于 catchtap 阻止冒泡
  noop() {},

  // 编辑
  onEdit() {
    if (!this.data.isAdmin) {
      showToast('请先登录', 'none')
      return
    }
    this.setData({
      showEditModal: true,
      editForm: { ...this.data.classInfo }
    })
  },

  onEditInput(e) {
    const { field } = e.currentTarget.dataset
    this.setData({
      [`editForm.${field}`]: e.detail.value
    })
  },

  onCloseEditModal() {
    this.setData({ showEditModal: false })
  },

  async onSaveEdit() {
    if (!this.data.isAdmin) {
      showToast('权限不足', 'none')
      return
    }

    showLoading('保存中...')
    try {
      const res = await callCloud('updateClassInfo', {
        ...this.data.editForm,
        password: app.globalData.adminPassword
      })
      hideLoading()
      if (res.success) {
        showToast('保存成功', 'success')
        this.setData({
          showEditModal: false,
          classInfo: this.data.editForm
        })
      } else {
        showToast(res.message || '保存失败', 'none')
      }
    } catch (err) {
      hideLoading()
      console.error('保存失败', err)
      showToast('保存失败', 'none')
    }
  }
})