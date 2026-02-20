const { getStats } = require('../../utils/storage')

Page({
  data: {
    totalPractice: 0,
    totalBattle: 0
  },
  onShow() {
    const stats = getStats()
    const practiceTotal = (stats.totalCount || 0) + ((stats.heqie && stats.heqie.totalCount) || 0)
    const streak = stats.streakMode || {}
    const pk = stats.pkMode || {}
    const battleTotal = (streak.totalGames || 0) + (pk.wins || 0) + (pk.losses || 0) + (pk.draws || 0)
    this.setData({ totalPractice: practiceTotal, totalBattle: battleTotal })
  }
})
