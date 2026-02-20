const { createWall, shuffle, tilesToHandArray, JOKER_ID, isNumeric, getSuit, getNumber, tileToString } = require('./tiles')
const { calcShantenWithJoker } = require('./shanten')
const { analyzeAllDiscards, calcRemainCount } = require('./efficiency')
const { calcDanger, detectSuitPattern } = require('./safety')

// 难度配置
const DIFF_CONFIG = {
  easy:   { riverCount: 1, turnRange: [6, 8],  types: ['safety'] },
  medium: { riverCount: 2, turnRange: [8, 12], types: ['safety', 'discard'] },
  hard:   { riverCount: 3, turnRange: [10, 15], types: ['discard', 'safety'] }
}

// 生成河切练习场景
function dealHeqieScenario(difficulty, maxAttempts = 200, rng) {
  const config = DIFF_CONFIG[difficulty]
  if (!config) return null

  const rand = rng || Math.random
  const questionType = config.types[Math.floor(rand() * config.types.length)]
  const turnNumber = config.turnRange[0] + Math.floor(rand() * (config.turnRange[1] - config.turnRange[0] + 1))

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const scenario = _buildScenario(config, questionType, turnNumber, rand)
    if (scenario) return scenario
  }

  return null
}

function _buildScenario(config, questionType, turnNumber, rand) {
  const wall = shuffle(createWall(), rand)
  let pos = 0

  // 我的手牌: 14张
  const myHand = wall.slice(pos, pos + 14).sort((a, b) => a - b)
  pos += 14

  // 对手手牌（每人13张）
  const opponents = []
  for (let i = 0; i < config.riverCount; i++) {
    const hand = wall.slice(pos, pos + 13)
    pos += 13
    opponents.push({ hand, river: [], melds: [] })
  }

  // 为每个对手生成牌河
  for (const opp of opponents) {
    const riverSize = Math.min(turnNumber, Math.floor((wall.length - pos) / config.riverCount))
    if (pos + riverSize > wall.length) return null
    const drawnTiles = wall.slice(pos, pos + riverSize)
    pos += riverSize

    const allTiles = [...opp.hand, ...drawnTiles]
    const sorted = _sortByDiscardPriority(allTiles, rand)
    opp.river = sorted.slice(0, Math.min(turnNumber, sorted.length))

    // 随机明牌
    if (rand() < 0.4 && opp.hand.length > 3) {
      const meld = _tryMakeMeld(opp.hand)
      if (meld) opp.melds.push(meld)
    }
  }

  const rivers = opponents.map(o => o.river)
  const openMelds = opponents.map(o => o.melds)
  const myFeeds = opponents.map(() => rand() < 0.15 ? 2 : (rand() < 0.3 ? 1 : 0))

  if (!_validateTileCounts(myHand, rivers, openMelds)) return null

  if (questionType === 'safety') {
    return _buildSafetyQuestion(myHand, rivers, openMelds, myFeeds, turnNumber)
  } else {
    return _buildDiscardQuestion(myHand, rivers, openMelds, myFeeds, turnNumber)
  }
}

function _sortByDiscardPriority(tiles, rand) {
  return [...tiles].sort((a, b) => {
    const pa = _discardPriority(a, rand)
    const pb = _discardPriority(b, rand)
    if (pa !== pb) return pb - pa
    return rand() - 0.5
  })
}

function _discardPriority(tileId, rand) {
  if (tileId === JOKER_ID) return 0
  if (!isNumeric(tileId)) return 90 + rand() * 10
  const num = getNumber(tileId)
  if (num === 1 || num === 9) return 70 + rand() * 10
  if (num === 2 || num === 8) return 50 + rand() * 10
  return 20 + rand() * 10
}

function _tryMakeMeld(hand) {
  const counts = new Array(34).fill(0)
  for (const t of hand) counts[t]++
  for (let i = 0; i < 34; i++) {
    if (i === JOKER_ID) continue
    if (counts[i] >= 3) {
      return { type: 'pon', tiles: [i, i, i] }
    }
  }
  return null
}

function _validateTileCounts(myHand, rivers, openMelds) {
  const counts = new Array(34).fill(0)
  for (const t of myHand) counts[t]++
  for (const r of rivers) for (const t of r) counts[t]++
  for (const melds of openMelds) {
    for (const meld of melds) {
      for (const t of meld.tiles) counts[t]++
    }
  }
  for (let i = 0; i < 34; i++) {
    if (counts[i] > 4) return false
  }
  return true
}

function _buildSafetyQuestion(myHand, rivers, openMelds, myFeeds, turnNumber) {
  const handArr = tilesToHandArray(myHand)
  const candidates = []
  const seen = new Set()
  for (const t of myHand) {
    if (seen.has(t)) continue
    seen.add(t)
    const danger = calcDanger(t, rivers[0], openMelds[0], handArr, myFeeds[0], turnNumber)
    candidates.push({ tile: t, danger })
  }

  if (candidates.length < 2) return null

  candidates.sort((a, b) => Math.abs(b.danger - 50) - Math.abs(a.danger - 50))
  const targetTile = candidates[0].tile
  const correctDanger = candidates[0].danger

  return {
    myHand,
    rivers,
    openMelds,
    myFeeds,
    turnNumber,
    questionType: 'safety',
    targetTile,
    correctDanger,
    correctLevel: correctDanger <= 30 ? 0 : (correctDanger <= 60 ? 1 : 2)
  }
}

function _buildDiscardQuestion(myHand, rivers, openMelds, myFeeds, turnNumber) {
  const handArr = tilesToHandArray(myHand)
  const remain = calcRemainCount(handArr)
  for (const r of rivers) for (const t of r) remain[t] = Math.max(0, remain[t] - 1)
  for (const melds of openMelds) {
    for (const meld of melds) {
      for (const t of meld.tiles) remain[t] = Math.max(0, remain[t] - 1)
    }
  }

  const effAnalysis = analyzeAllDiscards(handArr, remain)

  const scored = effAnalysis.map(a => {
    let maxDanger = 0
    for (let oi = 0; oi < rivers.length; oi++) {
      const d = calcDanger(a.tile, rivers[oi], openMelds[oi], handArr, myFeeds[oi], turnNumber)
      maxDanger = Math.max(maxDanger, d)
    }
    const offenseScore = Math.min(100, a.totalAcceptCount * 2)
    const defWeight = myFeeds.some(f => f >= 2) ? 1.5 : 0.8
    const score = offenseScore - maxDanger * defWeight
    return { ...a, maxDanger, offenseScore, score }
  })

  scored.sort((a, b) => {
    if (Math.abs(a.score - b.score) > 5) return b.score - a.score
    return b.totalAcceptCount - a.totalAcceptCount
  })

  if (scored.length < 2) return null
  const best = scored[0]
  const second = scored[1]
  if (Math.abs(best.score - second.score) < 3) return null

  return {
    myHand,
    rivers,
    openMelds,
    myFeeds,
    turnNumber,
    questionType: 'discard',
    analysis: scored,
    bestTile: best.tile
  }
}

module.exports = { dealHeqieScenario }
