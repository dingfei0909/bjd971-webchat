// 云函数：获取班级介绍
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const db = cloud.database()
  const classInfoColl = db.collection('classInfo')

  try {
    const res = await classInfoColl.limit(1).get()

    if (res.data && res.data.length > 0) {
      // 使用数据库中的数据
      const record = res.data[0]
      return {
        success: true,
        data: {
          school: record.school || '江苏大学',
          schoolOld: record.schoolOld || '（原江苏理工大学）',
          location: record.location || '虎踞北路50号',
          className: record.className || 'BJD971',
          classType: record.classType || '数本',
          year: record.year || '1997',
          description: record.description || '',
          motto: record.motto || ''
        }
      }
    }

    // 数据库无数据，返回默认值
    return {
      success: true,
      data: {
        school: '江苏大学',
        schoolOld: '（原江苏理工大学）',
        location: '虎踞北路50号',
        className: 'BJD971',
        classType: '数本',
        year: '1997',
        description: '我们是1997年入学的数本971班同学，在江苏大学度过了美好的大学时光。这里是我们共同的回忆。',
        motto: '同学情深，数本971永远的家'
      }
    }
  } catch (err) {
    return {
      success: false,
      message: err.message || '获取失败',
      data: {
        school: '江苏大学',
        schoolOld: '（原江苏理工大学）',
        location: '虎踞北路50号',
        className: 'BJD971',
        classType: '数本',
        year: '1997',
        description: '我们是1997年入学的数本971班同学，在江苏大学度过了美好的大学时光。这里是我们共同的回忆。',
        motto: '同学情深，数本971永远的家'
      }
    }
  }
}