// 云函数：获取媒体列表
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const { type, featuredOnly, page = 1, pageSize = 20, loadMore = false } = event

  const db = cloud.database()
  const mediaColl = db.collection('media')

  try {
    const field = {
      _id: true,
      type: true,
      url: true,
      cover: true,
      description: true,
      size: true,
      duration: true,
      uploaderName: true,
      uploaderOpenId: true,
      createdAt: true,
      featured: true,
      featuredAt: true
    }

    if (featuredOnly) {
      // 只要置顶的，按 featuredAt 降序
      const res = await mediaColl
        .field(field)
        .where({ type: type, featured: true })
        .orderBy('featuredAt', 'desc')
        .limit(1000)
        .get()
      return { success: true, data: res.data || [] }
    }

    // 完整列表：先查置顶的（按 featuredAt 降序），再查所有其他记录
    const baseWhere = type ? { type: type } : {}

    if (!loadMore) {
      // 首次加载：置顶 + 第一页非置顶
      // 1) 查置顶的（最多 1000 条，实际业务中置顶数量有限）
      const featuredRes = await mediaColl
        .field(field)
        .where({ ...baseWhere, featured: true })
        .orderBy('featuredAt', 'desc')
        .limit(1000)
        .get()

      const featuredList = featuredRes.data || []
      const featuredIds = featuredList.map(item => item._id)

      // 2) 查第一页非置顶记录
      const skip = (page - 1) * pageSize
      const normalRes = await mediaColl
        .field(field)
        .where(baseWhere)
        .orderBy('createdAt', 'desc')
        .skip(skip)
        .limit(pageSize)
        .get()

      // 3) 过滤掉已经在置顶列表里的，并去掉 featured=true 的（避免重复）
      const normalList = (normalRes.data || []).filter(item => {
        return !featuredIds.includes(item._id) && !item.featured
      })

      // 4) JS 二次排序置顶列表（兼容 featuredAt 缺失或为 0 的旧数据）
      const featured = featuredList.slice().sort((a, b) => {
        const aTime = a.featuredAt || 0
        const bTime = b.featuredAt || 0
        return bTime - aTime
      })

      // 5) 查询总数，用于判断是否还有更多
      const countRes = await mediaColl.where(baseWhere).count()

      return {
        success: true,
        data: [...featured, ...normalList],
        total: countRes.total,
        page: page,
        pageSize: pageSize,
        hasMore: (skip + pageSize) < countRes.total || featuredList.length > 0
      }
    } else {
      // 加载更多：只查询非置顶的下一页
      const skip = (page - 1) * pageSize
      const normalRes = await mediaColl
        .field(field)
        .where(baseWhere)
        .orderBy('createdAt', 'desc')
        .skip(skip)
        .limit(pageSize)
        .get()

      const normalList = (normalRes.data || []).filter(item => !item.featured)

      // 查询总数
      const countRes = await mediaColl.where(baseWhere).count()

      return {
        success: true,
        data: normalList,
        total: countRes.total,
        page: page,
        pageSize: pageSize,
        hasMore: (skip + pageSize) < countRes.total
      }
    }
  } catch (err) {
    return {
      success: false,
      message: err.message || '查询失败',
      data: []
    }
  }
}