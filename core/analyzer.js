const { tileToString, isJoker, isNumeric, getSuit, getNumber } = require('./tiles')

function generateExplanation(userChoice, bestChoice, analysis) {
  if (userChoice === bestChoice) {
    return '选择正确！你的判断和最优解一致。'
  }

  const userResult = analysis.find(a => a.tile === userChoice)
  const bestResult = analysis.find(a => a.tile === bestChoice)
  if (!userResult || !bestResult) return ''

  const parts = []

  if (userResult.shanten > bestResult.shanten) {
    parts.push(`打${tileToString(userChoice)}会增加向听数(${bestResult.shanten}→${userResult.shanten})，离胡牌更远了。`)
  }

  if (userResult.shanten === bestResult.shanten) {
    const diff = bestResult.totalAcceptCount - userResult.totalAcceptCount
    parts.push(`打${tileToString(bestChoice)}有${bestResult.totalAcceptCount}张有效进张，比打${tileToString(userChoice)}的${userResult.totalAcceptCount}张多${diff}张。`)
  }

  parts.push(_explainWhy(bestChoice, bestResult))

  return parts.filter(Boolean).join('')
}

function _explainWhy(tile, result) {
  if (isJoker(tile)) {
    return '财神是万能牌，一般不轻易打出。但此时打出财神反而有更多进张选择。'
  }

  const num = getNumber(tile)
  if (num === -1) {
    return `${tileToString(tile)}是孤张字牌，没有搭子配合，打出不影响手牌结构。`
  }

  if (num === 1 || num === 9) {
    return `${tileToString(tile)}是边张，能组成的搭子较少，优先级较低。`
  }

  if (result.totalAcceptCount > 0) {
    const acceptStr = result.accepts.slice(0, 3).map(a =>
      `${tileToString(a.tile)}(${a.count}张)`
    ).join('、')
    return `打出后可进${acceptStr}等牌。`
  }

  return ''
}

module.exports = { generateExplanation }
