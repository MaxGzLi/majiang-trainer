const { createWall, shuffle, JOKER_ID, tilesToHandArray } = require('./tiles')
const { calcShantenWithJoker } = require('./shanten')
const { analyzeAllDiscards, calcRemainCount } = require('./efficiency')

const DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard'
}

function dealHand(difficulty, maxAttempts = 200) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const wall = shuffle(createWall())
    const hand = wall.slice(0, 14)
    const handArr = tilesToHandArray(hand)
    const jokerCount = handArr[JOKER_ID]
    const shanten = calcShantenWithJoker(handArr)

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
    if (analysis.length < 2) continue

    const best = analysis[0]
    const second = analysis[1]
    const minGap = difficulty === DIFFICULTY.EASY ? 4 : 2

    if (best.shanten < second.shanten ||
        (best.shanten === second.shanten && best.totalAcceptCount - second.totalAcceptCount >= minGap)) {
      hand.sort((a, b) => a - b)
      return { tiles: hand, difficulty, analysis }
    }
  }

  return dealHandFallback(difficulty)
}

function dealHandFallback(difficulty) {
  for (let i = 0; i < 500; i++) {
    const wall = shuffle(createWall())
    const hand = wall.slice(0, 14)
    const handArr = tilesToHandArray(hand)
    const jokerCount = handArr[JOKER_ID]
    const shanten = calcShantenWithJoker(handArr)

    if (shanten < 0 || shanten > 2) continue

    // Respect basic difficulty constraints even in fallback
    if (difficulty === DIFFICULTY.EASY && jokerCount > 0) continue
    if (difficulty === DIFFICULTY.MEDIUM && (jokerCount < 1 || jokerCount > 2)) continue
    if (difficulty === DIFFICULTY.HARD && jokerCount < 1) continue

    hand.sort((a, b) => a - b)
    const remain = calcRemainCount(handArr)
    const analysis = analyzeAllDiscards(handArr, remain)
    return { tiles: hand, difficulty, analysis }
  }
  return null
}

module.exports = { dealHand, DIFFICULTY }
