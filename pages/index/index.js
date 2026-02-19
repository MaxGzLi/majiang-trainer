const { getStats } = require('../../utils/storage')

Page({
  data: {
    difficulty: 'easy',
    stats: null,
    correctRate: 0
  },
  onShow() {
    const stats = getStats()
    const correctRate = stats.totalCount > 0 ? Math.round(stats.correctCount / stats.totalCount * 100) : 0
    this.setData({ stats, correctRate })
  },
  selectDifficulty(e) {
    this.setData({ difficulty: e.currentTarget.dataset.level })
  },
  startPractice() {
    wx.navigateTo({
      url: '/pages/practice/practice?difficulty=' + this.data.difficulty
    })
  },
  goStats() {
    wx.navigateTo({ url: '/pages/stats/stats' })
  }
})
