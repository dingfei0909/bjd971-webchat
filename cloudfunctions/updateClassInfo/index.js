// 云函数：更新班级介绍
// 注意：前端直接展开 editForm 字段，所以接收平铺的参数
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const eventData = event || {}

  // 提取密码（不写入数据库）
  const { password, ...updateData } = eventData

  if (password !== 'feiger') {
    return { success: false, message: '管理员密码错误' }
  }

  const db = cloud.database()
  const classInfoColl = db.collection('classInfo')

  try {
    // 获取现有记录
    const existing = await classInfoColl.limit(1).get()

    if (existing.data && existing.data.length > 0) {
      // 更新已有记录
      const recordId = existing.data[0]._id
      await classInfoColl.doc(recordId).update({
        data: {
          ...updateData,
          updatedAt: Date.now()
        }
      })
    } else {
      // 没有记录则新建
      await classInfoColl.add({
        data: {
          ...updateData,
          createdAt: Date.now()
        }
      })
    }

    return { success: true }
  } catch (err) {
    return {
      success: false,
      message: err.message || '更新失败'
    }
  }
}