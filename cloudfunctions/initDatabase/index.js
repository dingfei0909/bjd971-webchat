// 云函数：初始化数据库
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const db = cloud.database()

  try {
    // 创建 media 集合（如果不存在）
    const mediaColl = db.collection('media')
    // 创建 classInfo 集合（如果不存在）
    const classInfoColl = db.collection('classInfo')

    // 初始化班级信息（如果不存在）
    const existClassInfo = await classInfoColl.count()
    if (existClassInfo.total === 0) {
      await classInfoColl.add({
        data: {
          school: '江苏大学',
          schoolOld: '（原江苏理工大学）',
          location: '虎踞北路50号',
          className: 'BJD971',
          classType: '数本',
          year: '1997',
          description: '我们是1997年入学的数本971班同学，在江苏大学度过了美好的大学时光。',
          motto: '同学情深，数本971永远的家',
          createdAt: Date.now()
        }
      })
    }

    return {
      success: true,
      results: [
        'media 集合已确认',
        'classInfo 集合已初始化'
      ]
    }
  } catch (err) {
    return {
      success: false,
      message: err.message || '初始化失败'
    }
  }
}