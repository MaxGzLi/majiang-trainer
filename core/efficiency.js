const { calcShantenWithJoker } = require('./shanten')
const { JOKER_ID } = require('./tiles')

// 分析打出某张牌后的牌效率
function analyzeDiscard(hand, tileToDiscard, remainCount) {
  hand[tileToDiscard]--
  const shantenAfter = calcShantenWithJoker(hand)

  let accepts = []
  let totalAcceptCount = 0

  for (let i = 0; i < 34; i++) {
    if (remainCount[i] <= 0) continue
    hand[i]++
    const newShanten = calcShantenWithJoker(hand)
    if (newShanten < shantenAfter) {
      accepts.push({ tile: i, count: remainCount[i] })
      totalAcceptCount += remainCount[i]
    }
    hand[i]--
  }

  hand[tileToDiscard]++ // restore
  return { shanten: shantenAfter, accepts, totalAcceptCount }
}

// 分析所有可打牌的牌效, 返回排序结果
function analyzeAllDiscards(hand, remainCount) {
  const results = []
  const seen = new Set()

  for (let i = 0; i < 34; i++) {
    if (hand[i] <= 0) continue
    if (seen.has(i)) continue
    seen.add(i)

    const analysis = analyzeDiscard(hand, i, remainCount)
    results.push({
      tile: i,
      shanten: analysis.shanten,
      accepts: analysis.accepts,
      totalAcceptCount: analysis.totalAcceptCount
    })
  }

  results.sort((a, b) => {
    if (a.shanten !== b.shanten) return a.shanten - b.shanten
    return b.totalAcceptCount - a.totalAcceptCount
  })

  return results
}

// 计算剩余牌数(仅看到自己手牌)
function calcRemainCount(hand) {
  const remain = new Array(34).fill(4)
  for (let i = 0; i < 34; i++) {
    remain[i] -= hand[i]
  }
  return remain
}

module.exports = { analyzeDiscard, analyzeAllDiscards, calcRemainCount }
