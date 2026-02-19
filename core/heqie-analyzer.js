const { tileToString, isNumeric, getSuit, getNumber, JOKER_ID } = require('./tiles')
const { calcDanger, detectSuitPattern, dangerToLevel, dangerLevelToText } = require('./safety')

const SUIT_NAMES = ['万字', '筒子', '条子']

// 安全判断题的解析
function explainSafety(tileId, river, melds, myHand, feedCount, turnNumber) {
  const danger = calcDanger(tileId, river, melds, myHand, feedCount, turnNumber)
  const level = dangerToLevel(danger)
  const name = tileToString(tileId)
  const parts = []

  if (river.includes(tileId)) {
    parts.push(`${name}是安全的。对手自己打过这张牌，说明他不需要它。`)
    return parts.join('')
  }

  if (tileId === JOKER_ID) {
    parts.push(`${name}（财神）非常危险！财神是万能牌，任何对手都需要它。`)
    return parts.join('')
  }

  // 花色分析
  const pattern = detectSuitPattern(river, melds)

  if (isNumeric(tileId)) {
    const suit = getSuit(tileId)
    const suitName = SUIT_NAMES[suit]

    if (pattern.safeSuits.includes(suit)) {
      parts.push(`${name}比较安全。`)
      parts.push(`对手牌河里打了很多${suitName}，说明他不太需要${suitName}。`)
    } else if (pattern.dangerSuits.includes(suit)) {
      parts.push(`${name}比较危险！`)
      const reasons = []
      if (pattern.riverSuitCount[suit] === 0) {
        reasons.push(`对手牌河里没有打过${suitName}，他可能在收集${suitName}`)
      }
      if (pattern.meldSuitCount[suit] >= 3) {
        reasons.push(`对手已经碰/吃了${suitName}`)
      }
      if (reasons.length > 0) parts.push(reasons.join('，而且') + '。')

      const num = getNumber(tileId)
      if (num >= 3 && num <= 7) {
        parts.push(`${name}是中张牌，能和很多牌搭配，被吃碰的概率更高。`)
      }
    } else {
      parts.push(`${name}的安全程度一般。`)
      parts.push(`从牌河来看，暂时无法确定对手对${suitName}的需求。`)
    }
  } else {
    // 字牌分析
    const sameInRiver = river.filter(t => t === tileId).length
    if (sameInRiver > 0) {
      parts.push(`${name}比较安全，牌河里已经出过${sameInRiver}张。`)
    } else {
      const honorMelds = melds.filter(m => m.tiles[0] >= 27)
      if (honorMelds.length > 0) {
        parts.push(`${name}有一定风险。对手已经碰了字牌，可能还需要其他字牌凑刻子。`)
      } else {
        parts.push(`${name}安全程度一般。字牌通常比数牌安全些，但要注意对手是否在收集。`)
      }
    }
  }

  // 承包预警
  if (feedCount >= 2) {
    parts.push(`\n⚠️ 特别注意：你已经喂了这个对手${feedCount}摊，再喂一次就三摊承包了！${dangerLevelToText(level) === '危险' ? '这张牌千万不能打！' : '要格外小心。'}`)
  }

  return parts.join('')
}

// 弃牌题的综合解析
function explainDiscard(userTile, bestTile, userDanger, bestDanger, userAccept, bestAccept) {
  const userName = tileToString(userTile)
  const bestName = tileToString(bestTile)
  const parts = []

  if (userTile === bestTile) {
    parts.push('选对了！')
    if (bestDanger > 60) {
      parts.push(`虽然${bestName}有一定风险，但它的牌效太差了，不值得留。`)
    } else if (bestAccept > 0) {
      parts.push(`${bestName}打出后安全，而且不影响手牌结构。`)
    }
    return parts.join('')
  }

  // 用户选错了
  if (userDanger > bestDanger + 20) {
    parts.push(`打${userName}太危险了！危险度远高于打${bestName}。`)
  } else if (userAccept < bestAccept - 5) {
    parts.push(`打${userName}虽然安全，但牌效比打${bestName}差太多（少接${bestAccept - userAccept}张有用牌）。`)
  } else {
    parts.push(`打${bestName}比打${userName}更好。`)
  }

  if (bestDanger <= 30 && bestAccept > userAccept) {
    parts.push(`${bestName}既安全又不影响牌效，是攻守兼顾的最佳选择。`)
  } else if (bestDanger <= 30) {
    parts.push(`${bestName}很安全，在不影响进度的前提下优先选安全的牌。`)
  } else if (bestAccept > userAccept + 10) {
    parts.push(`虽然${bestName}有一些风险，但牌效优势太大，值得赌一下。`)
  }

  return parts.join('')
}

// 格式化安全判断结果
function formatSafetyResult(danger) {
  const level = dangerToLevel(danger)
  const labels = ['安全 🟢', '注意 🟡', '危险 🔴']
  return { level, label: labels[level], danger }
}

module.exports = { explainSafety, explainDiscard, formatSafetyResult }
