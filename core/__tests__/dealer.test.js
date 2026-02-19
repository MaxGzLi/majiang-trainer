const { dealHand, DIFFICULTY } = require('../dealer')
const { tileToString, isJoker, tilesToHandArray } = require('../tiles')
const { calcShantenWithJoker } = require('../shanten')

function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg)
}

function runTests() {
  const easy = dealHand(DIFFICULTY.EASY)
  assert(easy !== null, '入门发牌成功')
  assert(easy.tiles.length === 14, '入门14张牌')
  assert(!easy.tiles.some(t => isJoker(t)), '入门无财神')
  console.log('入门:', easy.tiles.map(tileToString).join(' '))

  const med = dealHand(DIFFICULTY.MEDIUM)
  assert(med !== null, '进阶发牌成功')
  assert(med.tiles.length === 14, '进阶14张牌')
  assert(med.tiles.some(t => isJoker(t)), '进阶有财神')
  console.log('进阶:', med.tiles.map(tileToString).join(' '))

  const hard = dealHand(DIFFICULTY.HARD)
  assert(hard !== null, '高级发牌成功')
  assert(hard.tiles.length === 14, '高级14张牌')
  console.log('高级:', hard.tiles.map(tileToString).join(' '))

  assert(easy.analysis.length >= 2, '入门有分析')
  assert(med.analysis.length >= 2, '进阶有分析')

  console.log('All dealer tests passed!')
}

runTests()
