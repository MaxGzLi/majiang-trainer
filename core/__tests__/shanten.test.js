const { calcShanten, calcShantenWithJoker } = require('../shanten')
const { tilesToHandArray } = require('../tiles')

function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg)
}

function runTests() {
  // 已胡牌: 123万 456万 789万 123筒 11筒
  let h = tilesToHandArray([0,1,2, 3,4,5, 6,7,8, 9,10,11, 9,9])
  assert(calcShanten(h) === -1, '已胡牌 shanten=-1, got ' + calcShanten(h))

  // 听牌(13张): 123万 456万 789万 11筒 23筒 (听1筒或4筒)
  h = tilesToHandArray([0,1,2, 3,4,5, 6,7,8, 9,9, 10,11])
  assert(calcShanten(h) === 0, '听牌 shanten=0, got ' + calcShanten(h))

  // 七对听牌: 11万 22万 33万 44万 55万 66万 7万
  h = tilesToHandArray([0,0, 1,1, 2,2, 3,3, 4,4, 5,5, 6])
  assert(calcShanten(h) === 0, '七对听牌 shanten=0, got ' + calcShanten(h))

  // 七对胡牌
  h = tilesToHandArray([0,0, 1,1, 2,2, 3,3, 4,4, 5,5, 6,6])
  assert(calcShanten(h) === -1, '七对胡牌 shanten=-1, got ' + calcShanten(h))

  // === 财神测试 ===
  // 1张财神(13张): 123万 456万 789万 12筒 东 + 1财神
  h = tilesToHandArray([0,1,2, 3,4,5, 6,7,8, 9,10, 27, 33])
  // 无财神: 3面子(123万,456万,789万) + 1搭子(12筒) + 1孤张(东) → regular=2
  // 有1财神减1: 应该1向听
  const sj = calcShantenWithJoker(h)
  console.log('1 joker shanten:', sj)
  assert(sj >= 0 && sj <= 1, '1财神向听合理, got ' + sj)

  // 2张财神+好牌(13张): 123万 456万 789万 11筒 + 2财神
  h = tilesToHandArray([0,1,2, 3,4,5, 6,7,8, 9,9, 33,33])
  const sj2 = calcShantenWithJoker(h)
  console.log('2 joker shanten:', sj2)
  assert(sj2 <= 0, '2财神好牌应听牌, got ' + sj2)

  // 纯财神也要能算: 13张包含3张财神
  h = tilesToHandArray([0,1,2, 3,4,5, 9,10,11, 27, 33,33,33])
  const sj3 = calcShantenWithJoker(h)
  console.log('3 joker shanten:', sj3)
  assert(sj3 === -1, '3财神+3面子+1字牌应已胡, got ' + sj3)

  console.log('All shanten tests passed!')
}

runTests()
