const { createRng } = require('./prng')
const { dealHand } = require('./dealer')
const { dealHeqieScenario } = require('./heqie-dealer')

// 用种子生成混合题目序列（何切 + 河切）
// 同一 seed 保证生成完全一致的题目
function generateQuestionSequence(seed, count, difficulty) {
  const rng = createRng(seed)
  const questions = []
  for (let i = 0; i < count; i++) {
    const isHeqie = rng.next() < 0.4 // 40%河切 60%何切
    let q = null
    if (isHeqie) {
      q = dealHeqieScenario(difficulty, 200, rng.next)
    }
    if (!q) {
      q = dealHand(difficulty, 500, rng.next)
    }
    if (q) {
      q._qtype = q.questionType || 'practice'
    }
    questions.push(q)
  }
  return questions
}

module.exports = { generateQuestionSequence }
