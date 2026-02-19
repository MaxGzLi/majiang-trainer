const { dealHeqieScenario } = require('../heqie-dealer')
const { explainSafety, explainDiscard, formatSafetyResult } = require('../heqie-analyzer')
const { calcDanger, dangerToLevel } = require('../safety')
const { tilesToHandArray, tileToString } = require('../tiles')

function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg)
}

function runE2E() {
  console.log('=== 河切端到端测试 ===\n')

  // 各难度测试
  for (const diff of ['easy', 'medium', 'hard']) {
    console.log(`--- ${diff} 难度 ---`)
    const scenario = dealHeqieScenario(diff)
    assert(scenario !== null, `${diff} 场景生成`)
    assert(scenario.myHand.length === 14, `${diff} 手牌14张`)
    assert(scenario.rivers.length >= 1, `${diff} 有牌河`)

    console.log(`题型: ${scenario.questionType}`)
    console.log(`手牌: ${scenario.myHand.map(tileToString).join(' ')}`)
    console.log(`牌河数: ${scenario.rivers.length}`)
    for (let i = 0; i < scenario.rivers.length; i++) {
      console.log(`  对手${i+1}牌河: ${scenario.rivers[i].map(tileToString).join(' ')}`)
      if (scenario.openMelds[i].length > 0) {
        console.log(`  对手${i+1}明牌: ${scenario.openMelds[i].map(m => m.type + ':' + m.tiles.map(tileToString).join('')).join(' ')}`)
      }
    }

    if (scenario.questionType === 'safety') {
      console.log(`目标牌: ${tileToString(scenario.targetTile)}`)
      console.log(`正确危险度: ${scenario.correctDanger} (${['安全','注意','危险'][scenario.correctLevel]})`)
      const handArr = tilesToHandArray(scenario.myHand)
      const explain = explainSafety(scenario.targetTile, scenario.rivers[0], scenario.openMelds[0], handArr, scenario.myFeeds[0], scenario.turnNumber)
      console.log(`解析: ${explain}`)
      assert(explain.length > 5, '安全解析有内容')
    } else {
      console.log(`最优弃牌: ${tileToString(scenario.bestTile)}`)
      assert(scenario.analysis.length >= 2, '弃牌分析有内容')
    }

    console.log()
  }

  // 稳定性测试
  console.log('--- 稳定性: 连续30局 ---')
  let ok = 0
  for (let i = 0; i < 30; i++) {
    const diffs = ['easy', 'medium', 'hard']
    const s = dealHeqieScenario(diffs[i % 3])
    if (s && s.myHand.length === 14) ok++
  }
  console.log(`成功 ${ok}/30`)
  assert(ok >= 25, '至少83%成功率')

  console.log('\n=== 河切端到端测试全部通过 ===')
}

runE2E()
