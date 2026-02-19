const { getStats } = require('../../utils/storage')

Page({
  data: {
    difficulty: 'easy',
    heqieDifficulty: 'easy',
    stats: null,
    correctRate: 0,
    heqieStats: null,
    heqieCorrectRate: 0
  },
  onShow() {
    const stats = getStats()
    const correctRate = stats.totalCount > 0 ? Math.round(stats.correctCount / stats.totalCount * 100) : 0
    const heqie = stats.heqie || {}
    const heqieCorrectRate = heqie.totalCount > 0 ? Math.round(heqie.correctCount / heqie.totalCount * 100) : 0
    this.setData({ stats, correctRate, heqieStats: heqie, heqieCorrectRate })
  },
  selectDifficulty(e) {
    this.setData({ difficulty: e.currentTarget.dataset.level })
  },
  selectHeqieDifficulty(e) {
    this.setData({ heqieDifficulty: e.currentTarget.dataset.level })
  },
  startPractice() {
    wx.navigateTo({
      url: '/pages/practice/practice?difficulty=' + this.data.difficulty
    })
  },
  startHeqie() {
    wx.navigateTo({
      url: '/pages/heqie/heqie?difficulty=' + this.data.heqieDifficulty
    })
  },
  goStats() {
    wx.navigateTo({ url: '/pages/stats/stats' })
  }
})
