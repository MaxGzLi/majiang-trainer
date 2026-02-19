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

    // 格式化为人话，只显示有差异的选项
    const allFormatted = analysis.map(a => formatAnalysisItem(a))
    const bestItem = allFormatted[0]

    // 过滤：只保留跟最优有差异的 + 最优本身 + 用户选择（最多5个）
    let displayAnalysis = [allFormatted[0]] // 最优一定显示
    for (let i = 1; i < allFormatted.length; i++) {
      const a = allFormatted[i]
      // 只显示有明显差异的选项（向听不同 或 进张差>=2）
      const isDiff = a.shanten !== bestItem.shanten ||
                     Math.abs(a.totalAcceptCount - bestItem.totalAcceptCount) >= 2
      const isUserChoice = a.tile === userTile
      if (isDiff || isUserChoice) displayAnalysis.push(a)
      if (displayAnalysis.length >= 5) break
    }
    // 如果过滤后只剩1个，至少显示第二名
    if (displayAnalysis.length === 1 && allFormatted.length > 1) {
      displayAnalysis.push(allFormatted[1])
    }

    // 计算进度条宽度
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
