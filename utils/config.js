// utils/config.js - 通用配置和工具函数

// 调用云函数
function callCloud(name, data = {}, timeout = 5000) {
  return new Promise((resolve, reject) => {
    let finished = false
    const timer = setTimeout(() => {
      if (finished) return
      finished = true
      reject(new Error(`云函数 ${name} 调用超时(${timeout}ms)`))
    }, timeout)

    wx.cloud.callFunction({
      name,
      data,
      success: res => {
        if (finished) return
        finished = true
        clearTimeout(timer)
        resolve(res.result)
      },
      fail: err => {
        if (finished) return
        finished = true
        clearTimeout(timer)
        reject(err)
      }
    })
  })
}

// 显示加载中
function showLoading(title = '加载中...') {
  wx.showLoading({ title, mask: true })
}

function hideLoading() {
  wx.hideLoading()
}

// 显示消息
function showToast(title, icon = 'none', duration = 2000) {
  wx.showToast({ title, icon, duration })
}

// 检查并请求相册权限
function checkSaveAuth() {
  return new Promise((resolve, reject) => {
    wx.getSetting({
      success(res) {
        if (res.authSetting['scope.writePhotosAlbum']) {
          resolve(true)
        } else {
          wx.authorize({
            scope: 'scope.writePhotosAlbum',
            success() {
              resolve(true)
            },
            fail() {
              wx.showModal({
                title: '需要相册权限',
                content: '保存到相册需要您授权访问相册，是否去设置？',
                confirmText: '去设置',
                success: (m) => {
                  if (m.confirm) {
                    wx.openSetting()
                  }
                  resolve(false)
                }
              })
            }
          })
        }
      }
    })
  })
}

// 下载文件并保存到相册
function downloadAndSave(url) {
  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url,
      success: (res) => {
        if (res.statusCode === 200) {
          wx.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => {
              wx.showToast({ title: '已保存到相册', icon: 'success' })
              resolve()
            },
            fail: (err) => {
              wx.showToast({ title: '保存失败', icon: 'none' })
              reject(err)
            }
          })
        } else {
          reject(new Error('下载失败'))
        }
      },
      fail: (err) => reject(err)
    })
  })
}

// 格式化日期
function formatDate(timestamp) {
  const d = new Date(timestamp)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 格式化日期时间（精确到分钟）
function formatDateTime(timestamp) {
  const d = new Date(timestamp)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

// 复制到剪贴板
function copyText(text, successMsg = '已复制') {
  wx.setClipboardData({
    data: text,
    success: () => {
      wx.showToast({ title: successMsg, icon: 'success' })
    }
  })
}

module.exports = {
  callCloud,
  showLoading,
  hideLoading,
  showToast,
  checkSaveAuth,
  downloadAndSave,
  formatDate,
  formatDateTime,
  copyText
}