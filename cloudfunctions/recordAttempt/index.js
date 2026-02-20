const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openId = wxContext.OPENID
  const today = new Date().toISOString().slice(0, 10)

  const records = await db.collection('pk_attempts').where({ openId, date: today }).get()

  if (records.data.length === 0) {
    await db.collection('pk_attempts').add({
      data: { openId, date: today, count: 1 }
    })
  } else {
    await db.collection('pk_attempts').doc(records.data[0]._id).update({
      data: { count: _.inc(1) }
    })
  }

  return { success: true }
}
