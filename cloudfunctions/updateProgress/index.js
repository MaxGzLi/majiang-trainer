const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openId = wxContext.OPENID
  const { roomId, score, current, finished } = event

  if (!roomId) return { success: false, error: '缺少房间号' }

  const rooms = await db.collection('rooms').where({ roomId }).get()
  if (rooms.data.length === 0) {
    return { success: false, error: '房间不存在' }
  }

  const room = rooms.data[0]
  if (!room.players[openId]) {
    return { success: false, error: '不在该房间' }
  }

  const updateData = {}
  updateData[`players.${openId}.score`] = score
  updateData[`players.${openId}.current`] = current
  updateData[`players.${openId}.finished`] = finished

  // 检查是否双方都完成
  const otherPlayers = Object.keys(room.players).filter(id => id !== openId)
  let allFinished = finished
  for (const pid of otherPlayers) {
    if (!room.players[pid].finished) {
      allFinished = false
      break
    }
  }
  if (allFinished && finished) {
    updateData.status = 'finished'
  }

  await db.collection('rooms').doc(room._id).update({ data: updateData })

  return { success: true }
}
