const { explainSafety, explainDiscard, formatSafetyResult } = require('../heqie-analyzer')
const { tilesToHandArray } = require('../tiles')

function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg)
}

function runTests() {
  // 安全判断解析
  const myHand = tilesToHandArray([3,4,5, 9,10,11, 18,19,20, 6,6, 28,28])
  const river = [0, 1, 2, 3, 5, 6] // 大量万字
  const melds = [{type: 'pon', tiles: [13,13,13]}]

  const safeExplain = explainSafety(4, river, melds, myHand, 0, 8) // 5万
  console.log('安全解析(5万):', safeExplain)
  assert(safeExplain.length > 10, '安全解析有内容')
  assert(safeExplain.includes('万'), '提到花色')

  const dangerExplain = explainSafety(14, river, melds, myHand, 2, 8) // 6筒+2摊
  console.log('危险解析(6筒):', dangerExplain)
  assert(dangerExplain.length > 10, '危险解析有内容')

  // 弃牌解析
  const discardExplain = explainDiscard(14, 4, 80, 12, 20, 8) // userTile=6筒 vs bestTile=5万
  console.log('弃牌解析:', discardExplain)
  assert(discardExplain.length > 10, '弃牌解析有内容')

  // 选对了的情况
  const correctExplain = explainDiscard(4, 4, 12, 12, 8, 8)
  console.log('选对解析:', correctExplain)
  assert(correctExplain.includes('选对'), '选对了应有提示')

  // formatSafetyResult
  const r1 = formatSafetyResult(10)
  assert(r1.level === 0, '10=安全级')
  assert(r1.label.includes('安全'), '安全标签')
  const r2 = formatSafetyResult(50)
  assert(r2.level === 1, '50=注意级')
  const r3 = formatSafetyResult(80)
  assert(r3.level === 2, '80=危险级')

  console.log('All heqie-analyzer tests passed!')
}

runTests()
