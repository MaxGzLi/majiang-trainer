const { createWall, shuffle, JOKER_ID, tilesToHandArray } = require('./tiles')
const { calcShantenWithJoker } = require('./shanten')
const { analyzeAllDiscards, calcRemainCount } = require('./efficiency')

const DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard'
}

// 检查一手牌是否有训练价值：最优选择必须明显好于其他选择
function hasTrainingValue(analysis, minGap) {
  if (analysis.length < 2) return false
  const best = analysis[0]
  const second = analysis[1]
  // 最优向听更小（离胡更近），或同向听但进张数差距够大
  if (best.shanten < second.shanten) return true
  if (best.shanten === second.shanten && best.totalAcceptCount - second.totalAcceptCount >= minGap) return true
  return false
}

function dealHand(difficulty, maxAttempts = 500, rng) {
  const minGap = difficulty === DIFFICULTY.EASY ? 4 : 2

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const wall = shuffle(createWall(), rng)
    const hand = wall.slice(0, 14)
    const handArr = tilesToHandArray(hand)
    const jokerCount = handArr[JOKER_ID]
    const shanten = calcShantenWithJoker(handArr)

    // 难度筛选
    let valid = false
    if (difficulty === DIFFICULTY.EASY) {
      valid = jokerCount === 0 && shanten >= 0 && shanten <= 1
    } else if (difficulty === DIFFICULTY.MEDIUM) {
      valid = jokerCount >= 1 && jokerCount <= 2 && shanten >= 0 && shanten <= 2
    } else if (difficulty === DIFFICULTY.HARD) {
      valid = jokerCount >= 1 && shanten >= 0 && shanten <= 2
    }
    if (!valid) continue

    const remain = calcRemainCount(handArr)
    const analysis = analyzeAllDiscards(handArr, remain)

    if (hasTrainingValue(analysis, minGap)) {
      hand.sort((a, b) => a - b)
      return { tiles: hand, difficulty, analysis }
    }
  }

  // 降低要求再试：gap 降到最低1张差距
  for (let attempt = 0; attempt < 300; attempt++) {
    const wall = shuffle(createWall(), rng)
    const hand = wall.slice(0, 14)
    const handArr = tilesToHandArray(hand)
    const jokerCount = handArr[JOKER_ID]
    const shanten = calcShantenWithJoker(handArr)

    if (shanten < 0 || shanten > 3) continue
    if (difficulty === DIFFICULTY.EASY && jokerCount > 0) continue
    if (difficulty === DIFFICULTY.MEDIUM && (jokerCount < 1 || jokerCount > 2)) continue
    if (difficulty === DIFFICULTY.HARD && jokerCount < 1) continue

    const remain = calcRemainCount(handArr)
    const analysis = analyzeAllDiscards(handArr, remain)

    // 至少要有1张差距
    if (hasTrainingValue(analysis, 1)) {
      hand.sort((a, b) => a - b)
      return { tiles: hand, difficulty, analysis }
    }
  }

  return null
}

module.exports = { dealHand, DIFFICULTY }
