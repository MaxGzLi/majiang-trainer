const STORAGE_KEY = 'majiang_trainer_stats'

function getStats() {
  try {
    const data = wx.getStorageSync(STORAGE_KEY)
    if (!data) return createDefaultStats()
    // 兼容旧版本：补上缺失字段
    if (!data.heqie) data.heqie = createDefaultHeqieStats()
    if (!data.streakMode) data.streakMode = createDefaultStreakModeStats()
    if (!data.pkMode) data.pkMode = createDefaultPkModeStats()
    return data
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

function createDefaultHeqieStats() {
  return {
    totalCount: 0,
    correctCount: 0,
    byDifficulty: {
      easy: { total: 0, correct: 0 },
      medium: { total: 0, correct: 0 },
      hard: { total: 0, correct: 0 }
    },
    byType: {
      discard: { total: 0, correct: 0 },
      safety: { total: 0, correct: 0 }
    }
  }
}

function createDefaultStreakModeStats() {
  return { bestStreak: 0, totalGames: 0 }
}

function createDefaultPkModeStats() {
  return { wins: 0, losses: 0, draws: 0 }
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
    },
    heqie: createDefaultHeqieStats(),
    streakMode: createDefaultStreakModeStats(),
    pkMode: createDefaultPkModeStats()
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

function recordHeqieResult(stats, difficulty, questionType, isCorrect) {
  if (!stats.heqie) stats.heqie = createDefaultHeqieStats()
  stats.heqie.totalCount++
  stats.heqie.byDifficulty[difficulty].total++
  stats.heqie.byType[questionType].total++
  if (isCorrect) {
    stats.heqie.correctCount++
    stats.heqie.byDifficulty[difficulty].correct++
    stats.heqie.byType[questionType].correct++
  }
  saveStats(stats)
  return stats
}

module.exports = { getStats, saveStats, recordResult, recordHeqieResult, createDefaultStats }
