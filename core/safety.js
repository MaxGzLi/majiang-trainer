const { isNumeric, getSuit, getNumber, JOKER_ID } = require('./tiles')

const DANGER_SAFE = 30   // 0-30: 安全
const DANGER_WARN = 60   // 31-60: 注意
const DANGER_HIGH = 100  // 61-100: 危险

// 计算所有可见牌数量（手牌+所有牌河+所有明牌）
function calcVisibleCount(myHand, allRivers, allMelds) {
  const visible = new Array(34).fill(0)
  for (let i = 0; i < 34; i++) visible[i] = myHand[i]
  for (const river of allRivers) {
    for (const t of river) visible[t]++
  }
  for (const melds of allMelds) {
    for (const meld of melds) {
      for (const t of meld.tiles) visible[t]++
    }
  }
  return visible
}

// 推断对手的花色倾向
function detectSuitPattern(river, melds) {
  const riverSuitCount = [0, 0, 0] // 万筒条
  let riverHonorCount = 0
  for (const t of river) {
    if (isNumeric(t)) {
      riverSuitCount[getSuit(t)]++
    } else {
      riverHonorCount++
    }
  }

  const meldSuitCount = [0, 0, 0]
  for (const meld of melds) {
    for (const t of meld.tiles) {
      if (isNumeric(t)) meldSuitCount[getSuit(t)]++
    }
  }

  const safeSuits = []
  const dangerSuits = []
  const totalRiverNumeric = riverSuitCount.reduce((a, b) => a + b, 0)

  for (let s = 0; s < 3; s++) {
    if (totalRiverNumeric > 0 && riverSuitCount[s] / totalRiverNumeric >= 0.4) {
      safeSuits.push(s)
    }
    if (meldSuitCount[s] >= 3) {
      dangerSuits.push(s)
    }
  }

  for (let s = 0; s < 3; s++) {
    if (riverSuitCount[s] === 0 && totalRiverNumeric >= 4 && !dangerSuits.includes(s)) {
      dangerSuits.push(s)
    }
  }

  return { safeSuits, dangerSuits, riverSuitCount, meldSuitCount }
}

// 计算单张牌对单个对手的危险度 (0-100)
function calcDanger(tileId, opponentRiver, opponentMelds, myHand, myFeedCount, turnNumber) {
  if (opponentRiver.includes(tileId)) return 0

  if (tileId === JOKER_ID) return 95

  let danger = 50

  if (isNumeric(tileId)) {
    const num = getNumber(tileId)
    if (num === 1 || num === 9) danger *= 0.7
    else if (num === 2 || num === 8) danger *= 0.85
  } else {
    danger *= 0.6
  }

  const pattern = detectSuitPattern(opponentRiver, opponentMelds)
  if (isNumeric(tileId)) {
    const suit = getSuit(tileId)
    if (pattern.safeSuits.includes(suit)) {
      danger *= 0.3
    }
    if (pattern.dangerSuits.includes(suit)) {
      danger *= 1.8
    }
  }

  if (!isNumeric(tileId)) {
    for (const meld of opponentMelds) {
      if (meld.tiles[0] >= 27) danger *= 1.3
    }
  }

  const sameInRiver = opponentRiver.filter(t => t === tileId).length
  if (isNumeric(tileId)) {
    const num = getNumber(tileId)
    let adjacentVisible = 0
    if (num > 1 && opponentRiver.filter(t => t === tileId - 1).length >= 2) adjacentVisible++
    if (num < 9 && opponentRiver.filter(t => t === tileId + 1).length >= 2) adjacentVisible++
    if (adjacentVisible > 0) danger *= 0.7
  }

  if (myFeedCount >= 2) {
    danger *= 2.0
  } else if (myFeedCount === 1) {
    danger *= 1.3
  }

  if (turnNumber >= 12) {
    danger *= 1.3
  } else if (turnNumber >= 8) {
    danger *= 1.1
  }

  return Math.min(100, Math.max(0, Math.round(danger)))
}

// 将危险度转为等级 0=安全 1=注意 2=危险
function dangerToLevel(danger) {
  if (danger <= DANGER_SAFE) return 0
  if (danger <= DANGER_WARN) return 1
  return 2
}

// 将危险等级转为中文
function dangerLevelToText(level) {
  return ['安全', '注意', '危险'][level] || '未知'
}

module.exports = {
  calcDanger, calcVisibleCount, detectSuitPattern,
  dangerToLevel, dangerLevelToText,
  DANGER_SAFE, DANGER_WARN, DANGER_HIGH
}
