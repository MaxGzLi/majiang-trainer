const STORAGE_KEY = 'majiang_trainer_stats'

function getStats() {
  try {
    const data = wx.getStorageSync(STORAGE_KEY)
    return data || createDefaultStats()
  } catch (e) {
    return createDefaultStats()
  }
}

function saveStats(stats) {
  try {
    wx.setStorageSync(STORAGE_KEY, stats)
  } catch (e) {
    console.error('保存失败', e)
  }
}

function createDefaultStats() {
  return {
    totalCount: 0,
    correctCount: 0,
    streak: 0,
    maxStreak: 0,
    byDifficulty: {
      easy: { total: 0, correct: 0 },
      medium: { total: 0, correct: 0 },
      hard: { total: 0, correct: 0 }
    }
  }
}

function recordResult(stats, difficulty, isCorrect) {
  stats.totalCount++
  stats.byDifficulty[difficulty].total++
  if (isCorrect) {
    stats.correctCount++
    stats.byDifficulty[difficulty].correct++
    stats.streak++
    stats.maxStreak = Math.max(stats.maxStreak, stats.streak)
  } else {
    stats.streak = 0
  }
  saveStats(stats)
  return stats
}

module.exports = { getStats, saveStats, recordResult, createDefaultStats }
