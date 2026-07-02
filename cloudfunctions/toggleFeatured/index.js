// 云函数：切换置顶状态（最多 6 个置顶，支持照片和视频）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const MAX_FEATURED = 6  // 最多置顶 6 个

exports.main = async (event, context) => {
  const { id, password, featured, type } = event

  if (password !== 'feiger') {
    return { success: false, message: '管理员密码错误' }
  }

  if (!id) {
    return { success: false, message: '缺少记录 ID' }
  }

  const mediaType = type || 'photo'  // 默认 photo，向后兼容

  const db = cloud.database()
  const mediaColl = db.collection('media')

  try {
    // 如果是要置顶（featured=true），先检查当前置顶数量
    if (featured) {
      const countRes = await mediaColl.where({
        type: mediaType,
        featured: true
      }).count()
      if (countRes.total >= MAX_FEATURED) {
        return {
          success: false,
          message: '置顶数量已达上限（' + MAX_FEATURED + '个），请先取消其他置顶'
        }
      }
    }

    await mediaColl.doc(id).update({
      data: {
        featured: !!featured,
        featuredAt: featured ? Date.now() : null,
        updatedAt: Date.now()
      }
    })
    return { success: true, featured: !!featured }
  } catch (err) {
    return {
      success: false,
      message: err.message || '更新失败'
    }
  }
}