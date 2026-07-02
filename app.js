// app.js
App({
  globalData: {
    // 通用配置
    uploadPassword: 'bjd971',     // 上传照片/视频密码
    adminPassword: 'feiger',      // 管理员密码
    isAdmin: false,                // 当前是否是管理员

    // 用户信息
    userInfo: null,
    uploaderName: '匿名同学',      // 微信昵称

    // 云开发环境
    cloudEnv: 'cloud1-d7gjaqsba4736f225',

    // 班级信息默认值（与云函数一致）
    classInfo: {
      school: '江苏大学',
      schoolOld: '（原江苏理工大学）',
      location: '虎踞北路50号',
      className: 'BJD971',
      classType: '数本',
      year: '1997',
      description: '我们是1997年入学的数本971班同学，在江苏大学度过了美好的大学时光。',
      motto: '同学情深，数本971永远的家'
    }
  },

  onLaunch() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('当前微信版本过低，请升级到最新微信')
      wx.showModal({
        title: '提示',
        content: '请将微信升级到最新版本后再使用',
        showCancel: false
      })
      return
    }

    // 加超时保护，避免云开发初始化阻塞小程序启动
    const initPromise = wx.cloud.init({
      env: 'cloud1-d7gjaqsba4736f225',
      traceUser: true
    })

    if (initPromise && typeof initPromise.then === 'function') {
      Promise.race([
        initPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('云开发初始化超时')), 3000)
        )
      ]).catch(err => {
        console.warn('云开发初始化失败，部分功能不可用：', err)
      })
    }

    // 监听华为/部分安卓的右侧边缘滑动，避免被系统判定为退出
    // 微信小程序没有 onRightEdgeSwipe 全局事件，只能在每个页面监听
    // 这里只作为参考，实际处理在页面 onLoad 中

    console.log('我们的数本971 小程序启动成功')
  },

  // 获取用户微信昵称（必须在用户点击回调中调用）
  getUploaderName() {
    const that = this
    // 如果已经获取过，直接返回
    if (that.globalData.userInfo && that.globalData.uploaderName && that.globalData.uploaderName !== '匿名同学') {
      return Promise.resolve(that.globalData.uploaderName)
    }
    // 否则弹窗让用户授权
    return new Promise(function (resolve, reject) {
      wx.getUserProfile({
        desc: '用于显示上传者姓名',
        success: function (res) {
          that.globalData.userInfo = res.userInfo || null
          that.globalData.uploaderName = (res.userInfo && res.userInfo.nickName) || '匿名同学'
          console.log('获取用户信息成功：', that.globalData.uploaderName)
          resolve(that.globalData.uploaderName)
        },
        fail: function (err) {
          console.warn('用户拒绝授权：', err)
          reject(err)
        }
      })
    })
  }
})