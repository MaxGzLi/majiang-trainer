const { dealHand } = require('../../core/dealer')
const { analyzeAllDiscards, calcRemainCount } = require('../../core/efficiency')
const { tilesToHandArray, tileToString } = require('../../core/tiles')
const { generateExplanation } = require('../../core/analyzer')
const { getStats, recordResult } = require('../../utils/storage')

Page({
  data: {
    difficulty: 'easy',
    tiles: [],
    selectedTile: -1,
    confirmed: false,
    analysis: [],
    bestTile: -1,
    userTile: -1,
    isCorrect: false,
    explanation: '',
    questionNum: 1,
    diffLabel: '入门',
    userTileStr: '',
    bestTileStr: ''
  },
  onLoad(options) {
    const difficulty = options.difficulty || 'easy'
    const labels = { easy: '入门', medium: '进阶', hard: '高级' }
    this.setData({ difficulty, diffLabel: labels[difficulty] || '入门' })
    this.newQuestion()
  },
  newQuestion() {
    const result = dealHand(this.data.difficulty)
    if (!result) {
      wx.showToast({ title: '发牌失败，请重试', icon: 'none' })
      return
    }
    this._preAnalysis = result.analysis
    this.setData({
      tiles: result.tiles,
      selectedTile: -1,
      confirmed: false,
      analysis: [],
      bestTile: -1,
      userTile: -1,
      isCorrect: false,
      explanation: '',
      userTileStr: '',
      bestTileStr: ''
    })
  },
  onTileSelect(e) {
    if (this.data.confirmed) return
    const tileId = e.detail.tileId
    if (this.data.selectedTile === tileId) {
      this.confirmChoice(tileId)
    } else {
      this.setData({ selectedTile: tileId })
    }
  },
  confirmChoice(userTile) {
    const analysis = this._preAnalysis
    const bestTile = analysis[0].tile
    const isCorrect = userTile === bestTile
    const explanation = generateExplanation(userTile, bestTile, analysis)

    const stats = getStats()
    recordResult(stats, this.data.difficulty, isCorrect)

    const displayAnalysis = analysis.slice(0, 5).map(a => ({
      tile: a.tile,
      tileStr: tileToString(a.tile),
      shanten: a.shanten,
      totalAcceptCount: a.totalAcceptCount,
      accepts: a.accepts
    }))

    this.setData({
      confirmed: true,
      analysis: displayAnalysis,
      bestTile,
      userTile,
      isCorrect,
      explanation,
      userTileStr: tileToString(userTile),
      bestTileStr: tileToString(bestTile)
    })
  },
  nextQuestion() {
    this.setData({ questionNum: this.data.questionNum + 1 })
    this.newQuestion()
  },
  goBack() {
    wx.navigateBack()
  }
})
