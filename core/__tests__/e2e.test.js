const { dealHand, DIFFICULTY } = require('../dealer')
const { analyzeAllDiscards, calcRemainCount } = require('../efficiency')
const { tilesToHandArray, tileToString } = require('../tiles')
const { generateExplanation } = require('../analyzer')

function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg)
}

function runE2E() {
  console.log('=== 端到端测试 ===\n')

  for (const diff of [DIFFICULTY.EASY, DIFFICULTY.MEDIUM, DIFFICULTY.HARD]) {
    console.log(`--- ${diff} 难度 ---`)
    const result = dealHand(diff)
    assert(result !== null, `${diff} 发牌成功`)
    assert(result.tiles.length === 14, `${diff} 14张牌`)

    console.log('手牌:', result.tiles.map(tileToString).join(' '))

    const handArr = tilesToHandArray(result.tiles)
    const remain = calcRemainCount(handArr)
    const analysis = analyzeAllDiscards(handArr, remain)

    assert(analysis.length >= 1, `${diff} 有分析结果`)

    const best = analysis[0]
    console.log(`最优: 打${tileToString(best.tile)}, 向听${best.shanten}, 进张${best.totalAcceptCount}张`)

    if (analysis.length >= 2) {
      const userChoice = analysis[1].tile
      const explanation = generateExplanation(userChoice, best.tile, analysis)
      console.log(`模拟选次优(${tileToString(userChoice)}): ${explanation}`)
    }

    // 验证正确选择的解析
    const correctExplanation = generateExplanation(best.tile, best.tile, analysis)
    assert(correctExplanation.includes('正确'), `${diff} 正确解析包含"正确"`)

    console.log()
  }

  // 多次发牌稳定性测试
  console.log('--- 稳定性测试: 连续发20局 ---')
  let successCount = 0
  for (let i = 0; i < 20; i++) {
    const diffs = [DIFFICULTY.EASY, DIFFICULTY.MEDIUM, DIFFICULTY.HARD]
    const d = diffs[i % 3]
    const result = dealHand(d)
    if (result && result.tiles.length === 14 && result.analysis.length >= 1) {
      successCount++
    }
  }
  console.log(`成功 ${successCount}/20 局`)
  assert(successCount === 20, `稳定性测试全部通过`)

  console.log('\n=== 端到端测试全部通过 ===')
}

runE2E()
