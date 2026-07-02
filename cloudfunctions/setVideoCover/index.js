// 云函数：设置视频封面
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const { id, cover, password } = event

  // 密码验证
  if (password !== 'feiger') {
    return { success: false, message: '密码错误' }
  }

  if (!id || !cover) {
    return { success: false, message: '参数不完整' }
  }

  const db = cloud.database()
  const mediaColl = db.collection('media')

  try {
    const res = await mediaColl.doc(id).update({
      data: {
        cover: cover,
        updatedAt: Date.now()
      }
    })

    return {
      success: true,
      data: res
    }
  } catch (err) {
    return {
      success: false,
      message: err.message || '更新失败'
    }
  }
}