const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openId = wxContext.OPENID
  const { roomId } = event

  if (!roomId) return { success: false, error: '缺少房间号' }

  const rooms = await db.collection('rooms').where({ roomId, status: 'waiting' }).get()
  if (rooms.data.length === 0) {
    return { success: false, error: '房间不存在或已开始' }
  }

  const room = rooms.data[0]

  // 检查是否已在房间
  if (room.players[openId]) {
    return { success: true, roomId, seed: room.seed, difficulty: room.difficulty, totalQuestions: room.totalQuestions }
  }

  // 检查人数
  if (Object.keys(room.players).length >= 2) {
    return { success: false, error: '房间已满' }
  }

  // 加入房间
  const updateData = {}
  updateData[`players.${openId}`] = { score: 0, current: 0, finished: false }
  updateData.status = 'playing'

  await db.collection('rooms').doc(room._id).update({ data: updateData })

  return {
    success: true,
    roomId,
    seed: room.seed,
    difficulty: room.difficulty,
    totalQuestions: room.totalQuestions
  }
}
