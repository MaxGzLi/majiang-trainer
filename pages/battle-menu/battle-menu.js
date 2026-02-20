const { getStats } = require('../../utils/storage')

Page({
  data: {
    streakBest: 0,
    streakGames: 0,
    pkWins: 0,
    pkLosses: 0
  },
  onShow() {
    const stats = getStats()
    const streak = stats.streakMode || {}
    const pk = stats.pkMode || {}
    this.setData({
      streakBest: streak.bestStreak || 0,
      streakGames: streak.totalGames || 0,
      pkWins: pk.wins || 0,
      pkLosses: pk.losses || 0
    })
  }
})
