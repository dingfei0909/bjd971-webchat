// 云函数：获取云存储文件的临时 HTTPS 链接
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const { fileIDs } = event

  if (!fileIDs || !Array.isArray(fileIDs) || fileIDs.length === 0) {
    return { success: false, message: '缺少 fileIDs 参数' }
  }

  try {
    const res = await cloud.getTempFileURL({
      fileList: fileIDs
    })

    // 转换为 id -> url 的映射
    const urlMap = {}
    if (res.fileList && Array.isArray(res.fileList)) {
      res.fileList.forEach(item => {
        if (item.fileID && item.tempFileURL) {
          urlMap[item.fileID] = item.tempFileURL
        }
      })
    }

    return {
      success: true,
      urlMap: urlMap,
      fileList: res.fileList || []
    }
  } catch (err) {
    return {
      success: false,
      message: err.message || '获取临时链接失败'
    }
  }
}