const { createRng } = require('../prng')
const { generateQuestionSequence } = require('../seeded-dealer')

function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg)
}

function runTests() {
  // 1. 同 seed 产生相同序列
  const rng1 = createRng(12345)
  const rng2 = createRng(12345)
  const seq1 = []
  const seq2 = []
  for (let i = 0; i < 100; i++) {
    seq1.push(rng1.next())
    seq2.push(rng2.next())
  }
  for (let i = 0; i < 100; i++) {
    assert(seq1[i] === seq2[i], `同seed第${i}个值相同: ${seq1[i]} vs ${seq2[i]}`)
  }
  console.log('同seed序列一致性: PASS')

  // 2. 不同 seed 产生不同序列
  const rng3 = createRng(12345)
  const rng4 = createRng(67890)
  let diffCount = 0
  for (let i = 0; i < 100; i++) {
    if (rng3.next() !== rng4.next()) diffCount++
  }
  assert(diffCount > 90, `不同seed应有大部分不同: ${diffCount}/100`)
  console.log('不同seed差异性: PASS')

  // 3. 值在 [0, 1) 范围内
  const rng5 = createRng(42)
  for (let i = 0; i < 1000; i++) {
    const v = rng5.next()
    assert(v >= 0 && v < 1, `值在[0,1)范围内: ${v}`)
  }
  console.log('值范围: PASS')

  // 4. seed 属性保留
  const rng6 = createRng(99999)
  assert(rng6.seed === 99999, 'seed属性保留')
  console.log('seed属性: PASS')

  // 5. generateQuestionSequence 确定性
  const seed = 54321
  const qs1 = generateQuestionSequence(seed, 5, 'easy')
  const qs2 = generateQuestionSequence(seed, 5, 'easy')
  assert(qs1.length === 5, '生成5题')
  assert(qs2.length === 5, '生成5题')
  for (let i = 0; i < 5; i++) {
    if (qs1[i] && qs2[i]) {
      // 何切题比较tiles，河切题比较myHand
      if (qs1[i].tiles) {
        assert(qs1[i].tiles.length === qs2[i].tiles.length, `题${i}牌数一致`)
        for (let j = 0; j < qs1[i].tiles.length; j++) {
          assert(qs1[i].tiles[j] === qs2[i].tiles[j], `题${i}牌${j}一致`)
        }
      } else if (qs1[i].myHand) {
        assert(qs1[i].myHand.length === qs2[i].myHand.length, `题${i}手牌数一致`)
        for (let j = 0; j < qs1[i].myHand.length; j++) {
          assert(qs1[i].myHand[j] === qs2[i].myHand[j], `题${i}手牌${j}一致`)
        }
      }
      assert(qs1[i]._qtype === qs2[i]._qtype, `题${i}类型一致`)
    }
  }
  console.log('种子出题确定性: PASS')

  console.log('All PRNG tests passed!')
}

runTests()
