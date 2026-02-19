const { calcDanger, calcVisibleCount, detectSuitPattern, DANGER_SAFE, DANGER_WARN, DANGER_HIGH } = require('../safety')
const { tilesToHandArray } = require('../tiles')

function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg)
}

function runTests() {
  // === 基础安全牌测试 ===

  // 对手自己打过的牌 = 安全
  const river1 = [0, 1, 27, 31] // 对手打过 1万 2万 东 中
  const melds1 = []
  const myHand = tilesToHandArray([3,4,5, 9,10,11, 18,19,20, 6,6, 28,28])
  const d1 = calcDanger(0, river1, melds1, myHand, 0, 8) // 问1万是否安全
  assert(d1 <= DANGER_SAFE, '对手打过的牌应安全, got ' + d1)

  // === 壁牌测试 ===
  // 4张都能看到 = 安全（相关顺子不存在）
  const myHand2 = tilesToHandArray([13,13, 0,1,2, 9,10,11, 18,19, 27,27, 28])
  const river2 = [13, 13] // 牌河2张5筒(id=13)，手里2张 → 4张全见
  const d2 = calcDanger(12, river2, [], myHand2, 0, 8) // 4筒
  console.log('壁牌安全度:', d2)

  // === 花色判断测试 ===
  // 对手大量弃万字 → 万字安全
  const river3 = [0, 1, 2, 3, 5, 6] // 对手打了大量万字
  const melds3 = [{type: 'pon', tiles: [13,13,13]}] // 碰了5筒
  const myHand3 = tilesToHandArray([9,10,11, 18,19,20, 27,28,29, 7,7, 30])
  const d_wan = calcDanger(4, river3, melds3, myHand3, 0, 8)  // 5万对该对手
  const d_tong = calcDanger(14, river3, melds3, myHand3, 0, 8) // 6筒对该对手
  console.log('万字危险度:', d_wan, '筒子危险度:', d_tong)
  assert(d_wan < d_tong, '对手弃万字 → 万字应比筒子安全')

  // === 承包加成测试 ===
  const d_feed0 = calcDanger(14, river3, melds3, myHand3, 0, 8) // 0摊
  const d_feed2 = calcDanger(14, river3, melds3, myHand3, 2, 8) // 2摊
  console.log('0摊危险:', d_feed0, '2摊危险:', d_feed2)
  assert(d_feed2 > d_feed0, '已喂2摊应增加危险度')

  // === detectSuitPattern 测试 ===
  const pattern = detectSuitPattern(river3, melds3)
  console.log('花色推断:', pattern)
  assert(pattern.safeSuits.includes(0), '万字应被判为安全花色')

  // === calcVisibleCount 测试 ===
  const visible = calcVisibleCount(myHand3, [river3], [melds3])
  assert(visible[0] >= 1, '1万至少可见1张')

  console.log('All safety tests passed!')
}

runTests()
