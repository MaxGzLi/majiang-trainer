const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 生成6位房间号
function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openId = wxContext.OPENID
  const { difficulty = 'medium' } = event

  // 生成唯一房间号（重试3次）
  let roomId = ''
  for (let i = 0; i < 3; i++) {
    const candidate = generateRoomId()
    const existing = await db.collection('rooms').where({ roomId: candidate, status: db.command.neq('finished') }).count()
    if (existing.total === 0) {
      roomId = candidate
      break
    }
  }
  if (!roomId) return { success: false, error: '房间号生成失败' }

  const seed = Math.floor(Math.random() * 0xFFFFFFFF)
  const players = {}
  players[openId] = { score: 0, current: 0, finished: false }

  await db.collection('rooms').add({
    data: {
      roomId,
      seed,
      status: 'waiting',
      difficulty,
      totalQuestions: 20,
      players,
      createdAt: db.serverDate()
    }
  })

  return { success: true, roomId, seed }
}
