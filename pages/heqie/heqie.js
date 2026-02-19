const { dealHeqieScenario } = require('../../core/heqie-dealer')
const { tileToString, tilesToHandArray } = require('../../core/tiles')
const { explainSafety, explainDiscard, formatSafetyResult } = require('../../core/heqie-analyzer')
const { calcDanger } = require('../../core/safety')
const { getStats, recordHeqieResult } = require('../../utils/storage')
const { formatAnalysisItem } = require('../../core/analyzer')

Page({
  data: {
    difficulty: 'easy',
    diffLabel: '入门',
    questionNum: 1,
    // 场景数据
    myHand: [],
    rivers: [],
    openMelds: [],
    myFeeds: [],
    turnNumber: 0,
    // 题型
    questionType: '',
    // 安全判断题
    targetTile: -1,
    targetTileStr: '',
    // 弃牌题
    selectedTile: -1,
    // 答题状态
    confirmed: false,
    userAnswer: -1,
    isCorrect: false,
    explanation: '',
    correctLabel: '',
    // 牌河标签
    riverLabels: ['下家', '对家', '上家'],
    // 弃牌对比
    analysis: [],
    bestTile: -1,
    bestTileStr: ''
  },

  onLoad(options) {
    const difficulty = options.difficulty || 'easy'
    const labels = { easy: '入门', medium: '进阶', hard: '高级' }
    this.setData({ difficulty, diffLabel: labels[difficulty] || '入门' })
    this.newQuestion()
  },

  newQuestion() {
    const scenario = dealHeqieScenario(this.data.difficulty)
    if (!scenario) {
      wx.showToast({ title: '场景生成失败，请重试', icon: 'none' })
      return
    }
    this._scenario = scenario

    const data = {
      myHand: scenario.myHand,
      rivers: scenario.rivers,
      openMelds: scenario.openMelds,
      myFeeds: scenario.myFeeds,
      turnNumber: scenario.turnNumber,
      questionType: scenario.questionType,
      confirmed: false,
      selectedTile: -1,
      userAnswer: -1,
      isCorrect: false,
      explanation: '',
      correctLabel: '',
      analysis: [],
      bestTile: -1,
      bestTileStr: '',
      targetTile: -1,
      targetTileStr: ''
    }

    if (scenario.questionType === 'safety') {
      data.targetTile = scenario.targetTile
      data.targetTileStr = tileToString(scenario.targetTile)
    }

    this.setData(data)
  },

  // 安全判断题：选择安全等级
  onSafetyChoice(e) {
    if (this.data.confirmed) return
    const level = parseInt(e.currentTarget.dataset.level)
    this._confirmSafety(level)
  },

  _confirmSafety(userLevel) {
    const s = this._scenario
    const isCorrect = userLevel === s.correctLevel
    const handArr = tilesToHandArray(s.myHand)
    const explanation = explainSafety(
      s.targetTile, s.rivers[0], s.openMelds[0],
      handArr, s.myFeeds[0], s.turnNumber
    )
    const result = formatSafetyResult(s.correctDanger)

    const stats = getStats()
    recordHeqieResult(stats, this.data.difficulty, 'safety', isCorrect)

    this.setData({
      confirmed: true,
      userAnswer: userLevel,
      isCorrect,
      explanation,
      correctLabel: result.label
    })
  },

  // 弃牌题：选择手牌
  onTileSelect(e) {
    if (this.data.confirmed) return
    if (this.data.questionType !== 'discard') return
    const tileId = e.detail.tileId
    if (this.data.selectedTile === tileId) {
      this._confirmDiscard(tileId)
    } else {
      this.setData({ selectedTile: tileId })
    }
  },

  _confirmDiscard(userTile) {
    const s = this._scenario
    const bestTile = s.bestTile
    const isCorrect = userTile === bestTile

    const userItem = s.analysis.find(a => a.tile === userTile)
    const bestItem = s.analysis.find(a => a.tile === bestTile)

    const explanation = explainDiscard(
      userTile, bestTile,
      userItem ? userItem.maxDanger : 50,
      bestItem ? bestItem.maxDanger : 50,
      userItem ? userItem.totalAcceptCount : 0,
      bestItem ? bestItem.totalAcceptCount : 0
    )

    // 格式化对比列表
    const maxAccept = s.analysis.length > 0 ? s.analysis[0].totalAcceptCount : 1
    const top5 = s.analysis.slice(0, 5).map(a => ({
      ...formatAnalysisItem(a),
      dangerLabel: a.maxDanger <= 30 ? '安全' : (a.maxDanger <= 60 ? '注意' : '危险'),
      dangerClass: a.maxDanger <= 30 ? 'safe' : (a.maxDanger <= 60 ? 'warn' : 'high'),
      barWidth: Math.round(a.totalAcceptCount / Math.max(maxAccept, 1) * 100)
    }))

    const stats = getStats()
    recordHeqieResult(stats, this.data.difficulty, 'discard', isCorrect)

    this.setData({
      confirmed: true,
      userAnswer: userTile,
      isCorrect,
      explanation,
      analysis: top5,
      bestTile: bestTile,
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
