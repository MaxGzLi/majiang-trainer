const { tileToString, isJoker, isNumeric, getSuit, getNumber } = require('./tiles')

// ========== 人话版解析 ==========

// 将向听数翻译成大白话
function shantenToText(shanten) {
  if (shanten === -1) return '已经胡牌了！'
  if (shanten === 0) return '只差一张就能胡！（听牌）'
  if (shanten === 1) return '还差2步胡牌'
  if (shanten === 2) return '还差3步胡牌'
  return '离胡牌还比较远'
}

// 将向听数翻译成简短标签
function shantenToShortText(shanten) {
  if (shanten === -1) return '胡了！'
  if (shanten === 0) return '听牌！'
  if (shanten === 1) return '差2步'
  if (shanten === 2) return '差3步'
  return '差' + (shanten + 1) + '步'
}

// 分析一张牌在手牌中的角色
function describeTileRole(tileId, hand) {
  const count = hand[tileId]
  const name = tileToString(tileId)

  if (isJoker(tileId)) return `${name}（财神）是万能牌`

  // 字牌
  if (!isNumeric(tileId)) {
    if (count >= 3) return `${name}已经有3张，组成了一组刻子`
    if (count === 2) return `${name}有一对，可以做将（雀头）`
    return `${name}是一张孤牌，跟其他牌搭不上关系`
  }

  // 数牌：检查是否有搭子
  const suit = getSuit(tileId)
  const num = getNumber(tileId)
  const suitStart = suit * 9
  const connections = []

  // 检查自身数量
  if (count >= 3) return `${name}有3张，已经组成一组刻子`
  if (count === 2) connections.push('有一对')

  // 检查与左右牌的关系
  if (num > 1 && hand[tileId - 1] > 0) connections.push(`和${tileToString(tileId - 1)}相邻`)
  if (num < 9 && hand[tileId + 1] > 0) connections.push(`和${tileToString(tileId + 1)}相邻`)
  if (num > 2 && hand[tileId - 2] > 0) connections.push(`和${tileToString(tileId - 2)}隔一张`)
  if (num < 8 && hand[tileId + 2] > 0) connections.push(`和${tileToString(tileId + 2)}隔一张`)

  // 检查是否已成顺子
  if (num <= 7 && hand[tileId + 1] > 0 && hand[tileId + 2] > 0) {
    return `${name}已经和${tileToString(tileId + 1)}${tileToString(tileId + 2)}组成一组顺子`
  }
  if (num >= 2 && num <= 8 && hand[tileId - 1] > 0 && hand[tileId + 1] > 0) {
    return `${name}已经和${tileToString(tileId - 1)}${tileToString(tileId + 1)}组成一组顺子`
  }
  if (num >= 3 && hand[tileId - 1] > 0 && hand[tileId - 2] > 0) {
    return `${name}已经和${tileToString(tileId - 2)}${tileToString(tileId - 1)}组成一组顺子`
  }

  if (connections.length === 0) {
    if (num === 1 || num === 9) return `${name}是边张孤牌，能搭配的牌很少`
    return `${name}是一张孤牌，跟手里其他牌搭不上`
  }

  return `${name}${connections.join('，')}`
}

// 生成"为什么打这张"的人话解释
function explainBestChoice(bestTile, bestResult, hand) {
  const name = tileToString(bestTile)
  const role = describeTileRole(bestTile, hand)
  const parts = []

  parts.push(role + '。')

  if (isJoker(bestTile)) {
    parts.push('虽然财神很珍贵，但这手牌里打出它反而能接到更多有用的牌。')
    return parts.join('')
  }

  if (!isNumeric(bestTile) && hand[bestTile] === 1) {
    parts.push('打掉这张孤张字牌，不会破坏手里的搭子结构，还能保留更多进牌机会。')
    return parts.join('')
  }

  const num = getNumber(bestTile)
  if (num === 1 || num === 9) {
    parts.push('边张牌只能往一个方向凑顺子，用处比中间的牌少，优先考虑打掉。')
    return parts.join('')
  }

  if (hand[bestTile] === 1 && isNumeric(bestTile)) {
    // 检查是否是孤牌
    const hasLeft = num > 1 && hand[bestTile - 1] > 0
    const hasRight = num < 9 && hand[bestTile + 1] > 0
    const hasLeft2 = num > 2 && hand[bestTile - 2] > 0
    const hasRight2 = num < 8 && hand[bestTile + 2] > 0
    if (!hasLeft && !hasRight && !hasLeft2 && !hasRight2) {
      parts.push('这张牌跟手里其他牌都搭不上，打掉它不影响你组牌，还能保留更好的搭子等有用的牌进来。')
      return parts.join('')
    }
  }

  // 通用解释
  if (bestResult.totalAcceptCount > 0) {
    parts.push(`打掉它之后，你能摸到的有用牌最多（${bestResult.totalAcceptCount}张），胡牌的机会最大。`)
  }

  return parts.join('')
}

// 主函数：生成完整的解析
function generateExplanation(userChoice, bestChoice, analysis, hand) {
  const bestResult = analysis.find(a => a.tile === bestChoice)
  if (!bestResult) return ''

  if (userChoice === bestChoice) {
    // 即使选对了，也要解释为什么这是最好的
    return '选对了！' + explainBestChoice(bestChoice, bestResult, hand)
  }

  const userResult = analysis.find(a => a.tile === userChoice)
  if (!userResult) return ''

  const parts = []
  const userName = tileToString(userChoice)
  const bestName = tileToString(bestChoice)

  // 说明用户选择的问题
  if (userResult.shanten > bestResult.shanten) {
    parts.push(`打${userName}会让你离胡牌更远（从${shantenToShortText(bestResult.shanten)}变成${shantenToShortText(userResult.shanten)}），不划算。`)
  } else if (userResult.shanten === bestResult.shanten && bestResult.totalAcceptCount > userResult.totalAcceptCount) {
    const diff = bestResult.totalAcceptCount - userResult.totalAcceptCount
    parts.push(`打${userName}和打${bestName}虽然离胡牌的步数一样，但打${bestName}之后能摸到的有用牌多了${diff}张，胡牌机会更大。`)
  }

  // 解释为什么最优选择更好
  parts.push('\n' + explainBestChoice(bestChoice, bestResult, hand))

  return parts.join('')
}

// 格式化分析结果为人话
function formatAnalysisItem(item) {
  return {
    tile: item.tile,
    tileStr: tileToString(item.tile),
    shantenText: shantenToShortText(item.shanten),
    acceptText: `能接${item.totalAcceptCount}张有用牌`,
    totalAcceptCount: item.totalAcceptCount,
    shanten: item.shanten
  }
}

module.exports = { generateExplanation, formatAnalysisItem, shantenToText, shantenToShortText }
