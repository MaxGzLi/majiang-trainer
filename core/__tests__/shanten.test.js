const { calcShanten, calcShantenWithJoker } = require('../shanten')
const { tilesToHandArray, tileToString } = require('../tiles')

function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg)
}

function runTests() {
  // === 基础测试 ===

  // 已胡牌: 123万 456万 789万 11筒 12筒(补) → 14张
  let h = tilesToHandArray([0,1,2, 3,4,5, 6,7,8, 9,9, 10,11,11])
  // 实际手牌: 这不一定胡, 用标准胡牌
  h = tilesToHandArray([0,1,2, 3,4,5, 6,7,8, 9,10,11, 9,9])
  assert(calcShanten(h) === -1, '已胡牌 shanten=-1, got ' + calcShanten(h))

  // 七对听牌: 11万 22万 33万 44万 55万 66万 7万 (13张)
  h = tilesToHandArray([0,0, 1,1, 2,2, 3,3, 4,4, 5,5, 6])
  assert(calcShanten(h) === 0, '七对听牌 shanten=0, got ' + calcShanten(h))

  // 七对胡牌
  h = tilesToHandArray([0,0, 1,1, 2,2, 3,3, 4,4, 5,5, 6,6])
  assert(calcShanten(h) === -1, '七对胡牌 shanten=-1, got ' + calcShanten(h))

  // === 财神测试 ===

  // 1财神+好牌 (13张): 123万 456万 78万 12筒 东风 + 1财神
  h = tilesToHandArray([0,1,2, 3,4,5, 6,7, 9,10, 27, 33])
  const sj = calcShantenWithJoker(h)
  console.log('1 joker shanten:', sj)
  assert(sj >= 0 && sj <= 1, '1财神向听合理, got ' + sj)

  // 2财神+好牌 (13张): 123万 456万 789万 1筒 + 2财神
  h = tilesToHandArray([0,1,2, 3,4,5, 6,7,8, 9, 33,33, 27])
  const sj2 = calcShantenWithJoker(h)
  console.log('2 joker shanten:', sj2)
  assert(sj2 <= 0, '2财神好牌应听牌, got ' + sj2)

  // === 爆头测试 ===

  // 爆头听牌: 1财神 + 123万 456万 789万 123筒 (13张)
  // 1财神做单牌 + 4组完整面子 = 爆头听牌(摸任意牌都胡)
  h = tilesToHandArray([0,1,2, 3,4,5, 6,7,8, 9,10,11, 33])
  const bt = calcShantenWithJoker(h)
  console.log('爆头听牌:', bt)
  assert(bt === 0, '爆头听牌 shanten=0, got ' + bt)

  // 爆头差1步: 1财神 + 123万 456万 789万 12筒 (12张不够)
  // 用13张: 1财神 + 123万 456万 78万 12筒 1筒
  h = tilesToHandArray([0,1,2, 3,4,5, 6,7, 9,10, 9, 33])
  const bt2 = calcShantenWithJoker(h)
  console.log('爆头差步:', bt2)
  // 普通路线可能更好(财神补缺), 取最小值
  assert(bt2 >= 0 && bt2 <= 1, '爆头路线合理, got ' + bt2)

  // === 财神显示测试 ===
  assert(tileToString(33) === '财神', '白板应显示为"财神", got: ' + tileToString(33))
  assert(tileToString(32) === '发', '发应显示为"发", got: ' + tileToString(32))

  console.log('All shanten tests passed!')
}

runTests()
