const { dealHand } = require('../../core/dealer')
const { tilesToHandArray, tileToString } = require('../../core/tiles')
const { generateExplanation, formatAnalysisItem, shantenToText } = require('../../core/analyzer')
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
    bestTileStr: '',
    bestShantenText: '',
    bestAcceptText: ''
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
    this._handArr = tilesToHandArray(result.tiles)
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
      bestTileStr: '',
      bestShantenText: '',
      bestAcceptText: ''
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
    const handArr = this._handArr
    const bestTile = analysis[0].tile
    const isCorrect = userTile === bestTile
    const explanation = generateExplanation(userTile, bestTile, analysis, handArr)

    const stats = getStats()
    recordResult(stats, this.data.difficulty, isCorrect)

    // 格式化为人话
    const displayAnalysis = analysis.slice(0, 5).map(a => formatAnalysisItem(a))
    const bestItem = displayAnalysis[0]

    // 计算进张条的最大值用于百分比
    const maxAccept = Math.max(...displayAnalysis.map(a => a.totalAcceptCount), 1)
    displayAnalysis.forEach(a => {
      a.barWidth = Math.round(a.totalAcceptCount / maxAccept * 100)
    })

    this.setData({
      confirmed: true,
      analysis: displayAnalysis,
      bestTile,
      userTile,
      isCorrect,
      explanation,
      userTileStr: tileToString(userTile),
      bestTileStr: tileToString(bestTile),
      bestShantenText: shantenToText(bestItem.shanten),
      bestAcceptText: `能摸到${bestItem.totalAcceptCount}张有用的牌`
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
