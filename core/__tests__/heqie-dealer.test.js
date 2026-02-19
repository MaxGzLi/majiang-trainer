const { dealHeqieScenario } = require('../heqie-dealer')
const { tilesToHandArray } = require('../tiles')

function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg)
}

function runTests() {
  // 各难度都能生成场景
  for (const diff of ['easy', 'medium', 'hard']) {
    const scenario = dealHeqieScenario(diff)
    assert(scenario !== null, `${diff} 场景生成成功`)
    assert(scenario.myHand.length === 14, `${diff} 手牌14张`)
    assert(scenario.rivers.length >= 1, `${diff} 至少1家牌河`)
    assert(scenario.questionType === 'discard' || scenario.questionType === 'safety',
      `${diff} 题型合法: ${scenario.questionType}`)

    // 牌河合理性：牌数不超4
    const allTiles = [...scenario.myHand]
    for (const river of scenario.rivers) {
      allTiles.push(...river)
    }
    for (const melds of scenario.openMelds) {
      for (const meld of melds) {
        allTiles.push(...meld.tiles)
      }
    }
    const counts = new Array(34).fill(0)
    for (const t of allTiles) counts[t]++
    for (let i = 0; i < 34; i++) {
      assert(counts[i] <= 4, `${diff} 牌数不超4: tile ${i} has ${counts[i]}`)
    }

    console.log(`${diff}: type=${scenario.questionType}, rivers=${scenario.rivers.length}, hand=${scenario.myHand.length}`)
  }

  // 稳定性：连续生成20个场景
  let ok = 0
  for (let i = 0; i < 20; i++) {
    const diffs = ['easy', 'medium', 'hard']
    const s = dealHeqieScenario(diffs[i % 3])
    if (s && s.myHand.length === 14) ok++
  }
  console.log(`稳定性: ${ok}/20`)
  assert(ok >= 18, '至少90%成功率')

  console.log('All heqie-dealer tests passed!')
}

runTests()
