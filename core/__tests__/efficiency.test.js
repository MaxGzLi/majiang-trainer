const { analyzeAllDiscards, calcRemainCount } = require('../efficiency')
const { tilesToHandArray, tileToString } = require('../tiles')

function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg)
}

function runTests() {
  // 14张牌: 123万 456万 789万 8筒 12筒 55条
  const h = tilesToHandArray([0,1,2, 3,4,5, 6,7,8, 17, 9,10, 22,22])
  const remain = calcRemainCount(h)
  const results = analyzeAllDiscards(h, remain)

  assert(results.length > 0, '有分析结果')
  assert(results[0].shanten <= results[results.length - 1].shanten, '排序正确')
  assert(results[0].totalAcceptCount > 0, '最优选择有进张')

  console.log('Top choices:')
  for (let i = 0; i < Math.min(5, results.length); i++) {
    const r = results[i]
    console.log(`  打${tileToString(r.tile)}: 向听${r.shanten}, 进张${r.totalAcceptCount}张`)
  }

  console.log('All efficiency tests passed!')
}

runTests()
