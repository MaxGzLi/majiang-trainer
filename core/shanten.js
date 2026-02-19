const { JOKER_ID, isNumeric } = require('./tiles')

// 普通牌型向听数（递归拆分法）
function calcRegularShanten(hand) {
  let best = 8
  for (let i = 0; i < 34; i++) {
    if (hand[i] >= 2) {
      hand[i] -= 2
      const s = 8 - _countMentsu(hand, 0, 0, 0) - 1
      best = Math.min(best, s)
      hand[i] += 2
    }
  }
  const s = 8 - _countMentsu(hand, 0, 0, 0)
  best = Math.min(best, s)
  return best
}

// 递归统计面子+搭子, 返回 面子*2+搭子 的最大值(搭子<=4-面子)
function _countMentsu(hand, startIdx, mentsu, partial) {
  let best = mentsu * 2 + Math.min(partial, 4 - mentsu)

  for (let i = startIdx; i < 34; i++) {
    if (hand[i] === 0) continue

    // 刻子
    if (hand[i] >= 3) {
      hand[i] -= 3
      const v = _countMentsu(hand, i, mentsu + 1, partial)
      best = Math.max(best, v)
      hand[i] += 3
    }

    // 顺子（仅数牌, 不跨花色）
    if (isNumeric(i) && i % 9 <= 6 && hand[i + 1] > 0 && hand[i + 2] > 0) {
      hand[i]--; hand[i + 1]--; hand[i + 2]--
      const v = _countMentsu(hand, i, mentsu + 1, partial)
      best = Math.max(best, v)
      hand[i]++; hand[i + 1]++; hand[i + 2]++
    }

    // 对子搭子
    if (hand[i] >= 2) {
      hand[i] -= 2
      const v = _countMentsu(hand, i, mentsu, partial + 1)
      best = Math.max(best, v)
      hand[i] += 2
    }

    // 两面/嵌张搭子
    if (isNumeric(i) && i % 9 <= 7 && hand[i + 1] > 0) {
      hand[i]--; hand[i + 1]--
      const v = _countMentsu(hand, i, mentsu, partial + 1)
      best = Math.max(best, v)
      hand[i]++; hand[i + 1]++
    }

    // 坎张搭子
    if (isNumeric(i) && i % 9 <= 6 && hand[i + 2] > 0) {
      hand[i]--; hand[i + 2]--
      const v = _countMentsu(hand, i, mentsu, partial + 1)
      best = Math.max(best, v)
      hand[i]++; hand[i + 2]++
    }

    break // 只从第一张非零牌开始拆
  }

  return best
}

// 七对向听数
function calcSevenPairsShanten(hand) {
  let pairs = 0
  let types = 0
  for (let i = 0; i < 34; i++) {
    if (hand[i] >= 2) pairs += Math.floor(hand[i] / 2)
    if (hand[i] > 0) types++
  }
  pairs = Math.min(pairs, 7)
  if (types < 7) pairs = Math.min(pairs, types)
  return 6 - pairs
}

// 含财神的七对向听数
function calcSevenPairsWithJoker(hand, jokerCount) {
  let pairs = 0
  let singles = 0
  for (let i = 0; i < 34; i++) {
    if (i === JOKER_ID) continue
    pairs += Math.floor(hand[i] / 2)
    if (hand[i] % 2 === 1) singles++
  }
  const jokerPairs = Math.min(jokerCount, singles)
  pairs += jokerPairs
  const remainJokers = jokerCount - jokerPairs
  pairs += Math.floor(remainJokers / 2)
  pairs = Math.min(pairs, 7)
  return 6 - pairs
}

// 含财神的向听数计算
function calcShantenWithJoker(hand) {
  const jokerCount = hand[JOKER_ID]
  hand[JOKER_ID] = 0

  const regular = calcRegularShanten(hand)
  const total = hand.reduce((s, v) => s + v, 0) + jokerCount
  const qidui = total >= 13 ? calcSevenPairsWithJoker(hand, jokerCount) : 99

  hand[JOKER_ID] = jokerCount // restore

  const base = Math.min(regular, qidui)
  return Math.max(base - jokerCount, -1)
}

// 综合向听数（不含财神, backward compat）
function calcShanten(hand) {
  const total = hand.reduce((s, v) => s + v, 0)
  const regular = calcRegularShanten(hand)
  const qidui = total >= 13 ? calcSevenPairsShanten(hand) : 99
  return Math.min(regular, qidui)
}

module.exports = { calcShanten, calcRegularShanten, calcSevenPairsShanten, calcShantenWithJoker }
