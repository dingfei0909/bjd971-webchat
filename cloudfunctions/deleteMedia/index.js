// 云函数：删除媒体
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const { id, password } = event

  if (password !== 'feiger') {
    return { success: false, message: '管理员密码错误' }
  }

  if (!id) {
    return { success: false, message: '缺少记录 ID' }
  }

  const db = cloud.database()
  const mediaColl = db.collection('media')

  try {
    // 先查询记录获取 fileID，用于删除云存储文件
    const record = await mediaColl.doc(id).get()
    const fileID = record.data && record.data.url

    // 删除数据库记录
    await mediaColl.doc(id).remove()

    // 删除云存储文件
    if (fileID && fileID.startsWith('cloud://')) {
      try {
        await cloud.deleteFile({ fileList: [fileID] })
      } catch (fileErr) {
        console.warn('删除云存储文件失败：', fileErr)
        // 即使文件删除失败，数据库已删除，仍返回成功
      }
    }

    return { success: true }
  } catch (err) {
    return {
      success: false,
      message: err.message || '删除失败'
    }
  }
}