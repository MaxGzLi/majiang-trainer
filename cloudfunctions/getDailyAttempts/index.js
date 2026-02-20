const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const FREE_DAILY_LIMIT = 2

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openId = wxContext.OPENID
  const today = new Date().toISOString().slice(0, 10)

  const records = await db.collection('pk_attempts').where({ openId, date: today }).get()

  if (records.data.length === 0) {
    return { remaining: FREE_DAILY_LIMIT, used: 0 }
  }

  const used = records.data[0].count || 0
  return {
    remaining: Math.max(0, FREE_DAILY_LIMIT - used),
    used
  }
}
