const { getStats } = require('../../utils/storage')

Page({
  data: { stats: null, rate: 0, easyRate: 0, medRate: 0, hardRate: 0 },
  onShow() {
    const stats = getStats()
    const rate = stats.totalCount > 0 ? Math.round(stats.correctCount / stats.totalCount * 100) : 0
    const easyRate = stats.byDifficulty.easy.total > 0 ? Math.round(stats.byDifficulty.easy.correct / stats.byDifficulty.easy.total * 100) : 0
    const medRate = stats.byDifficulty.medium.total > 0 ? Math.round(stats.byDifficulty.medium.correct / stats.byDifficulty.medium.total * 100) : 0
    const hardRate = stats.byDifficulty.hard.total > 0 ? Math.round(stats.byDifficulty.hard.correct / stats.byDifficulty.hard.total * 100) : 0
    this.setData({ stats, rate, easyRate, medRate, hardRate })
  }
})
