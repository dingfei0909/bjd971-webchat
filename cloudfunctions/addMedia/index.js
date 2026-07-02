// 云函数：添加媒体（带数据库写入）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const { type, url, cover, description, size, duration, uploaderName, uploaderOpenId } = event

  if (!url) {
    return { success: false, message: '文件 URL 不能为空' }
  }

  const db = cloud.database()
  const mediaColl = db.collection('media')

  try {
    const res = await mediaColl.add({
      data: {
        type: type || 'photo',
        url: url,
        cover: cover || '',
        description: description || '',
        size: size || 0,
        duration: duration || '',
        uploaderName: uploaderName || '匿名同学',
        uploaderOpenId: uploaderOpenId || '',
        createdAt: Date.now()
      }
    })

    return {
      success: true,
      data: {
        _id: res._id,
        type: type || 'photo',
        url: url,
        cover: cover || '',
        description: description || '',
        size: size || 0,
        duration: duration || '',
        uploaderName: uploaderName || '匿名同学',
        uploaderOpenId: uploaderOpenId || '',
        createdAt: Date.now()
      }
    }
  } catch (err) {
    return {
      success: false,
      message: err.message || '添加失败'
    }
  }
}