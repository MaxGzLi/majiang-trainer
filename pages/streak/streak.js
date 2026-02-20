const { dealHand } = require('../../core/dealer')
const { dealHeqieScenario } = require('../../core/heqie-dealer')
const { tilesToHandArray, tileToString } = require('../../core/tiles')
const { generateExplanation, formatAnalysisItem, shantenToText } = require('../../core/analyzer')
const { explainSafety, explainDiscard, formatSafetyResult } = require('../../core/heqie-analyzer')
const { calcDanger } = require('../../core/safety')
const { getStats, saveStats } = require('../../utils/storage')
const { showRewardedAd, isAdEnabled } = require('../../utils/ad')

const MAX_REVIVES = 3

Page({
  data: {
    // 连对状态
    streak: 0,
    bestStreak: 0,
    revivesUsed: 0,
    revivesLeft: MAX_REVIVES,
    gameOver: false,
    // 题目状态
    questionType: '', // 'practice' | 'safety' | 'discard'
    // 何切数据
    tiles: [],
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
    bestAcceptText: '',
    // 河切数据
    myHand: [],
    rivers: [],
    openMelds: [],
    myFeeds: [],
    turnNumber: 0,
    targetTile: -1,
    targetTileStr: '',
    correctLabel: '',
    userAnswer: -1,
    riverLabels: ['下家', '对家', '上家'],
    // 复活弹窗
    showRevivePopup: false
  },

  onLoad() {
    const stats = getStats()
    const streakStats = stats.streakMode || { bestStreak: 0, totalGames: 0 }
    this.setData({ bestStreak: streakStats.bestStreak, adEnabled: isAdEnabled() })
    this._generateQuestion()
  },

  // 根据连对数动态选择难度
  _getDifficulty() {
    if (this.data.streak < 5) return 'easy'
    if (this.data.streak < 15) return 'medium'
    return 'hard'
  },

  _generateQuestion() {
    const difficulty = this._getDifficulty()
    const isHeqie = Math.random() < 0.4

    let scenario = null
    if (isHeqie) {
      scenario = dealHeqieScenario(difficulty)
    }

    if (scenario) {
      this._scenario = scenario
      const data = {
        questionType: scenario.questionType,
        myHand: scenario.myHand,
        rivers: scenario.rivers,
        openMelds: scenario.openMelds,
        myFeeds: scenario.myFeeds,
        turnNumber: scenario.turnNumber,
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
        targetTileStr: '',
        tiles: [],
        userTile: -1,
        userTileStr: '',
        bestShantenText: '',
        bestAcceptText: ''
      }
      if (scenario.questionType === 'safety') {
        data.targetTile = scenario.targetTile
        data.targetTileStr = tileToString(scenario.targetTile)
      }
      this.setData(data)
    } else {
      // 何切题
      const result = dealHand(difficulty)
      if (!result) {
        wx.showToast({ title: '发牌失败，请重试', icon: 'none' })
        return
      }
      this._preAnalysis = result.analysis
      this._handArr = tilesToHandArray(result.tiles)
      this.setData({
        questionType: 'practice',
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
        bestAcceptText: '',
        myHand: [],
        rivers: [],
        openMelds: [],
        myFeeds: [],
        turnNumber: 0,
        targetTile: -1,
        targetTileStr: '',
        correctLabel: '',
        userAnswer: -1
      })
    }
  },

  // 何切题：选牌
  onTileSelect(e) {
    if (this.data.confirmed) return
    const tileId = e.detail.tileId
    if (this.data.questionType === 'practice') {
      if (this.data.selectedTile === tileId) {
        this._confirmPractice(tileId)
      } else {
        this.setData({ selectedTile: tileId })
      }
    } else if (this.data.questionType === 'discard') {
      if (this.data.selectedTile === tileId) {
        this._confirmDiscard(tileId)
      } else {
        this.setData({ selectedTile: tileId })
      }
    }
  },

  // 安全判断题
  onSafetyChoice(e) {
    if (this.data.confirmed) return
    const level = parseInt(e.currentTarget.dataset.level)
    this._confirmSafety(level)
  },

  _confirmPractice(userTile) {
    const analysis = this._preAnalysis
    const handArr = this._handArr
    const bestTile = analysis[0].tile
    const isCorrect = userTile === bestTile
    const explanation = generateExplanation(userTile, bestTile, analysis, handArr)

    const allFormatted = analysis.map(a => formatAnalysisItem(a))
    const bestItem = allFormatted[0]

    let displayAnalysis = [allFormatted[0]]
    for (let i = 1; i < allFormatted.length; i++) {
      const a = allFormatted[i]
      const isDiff = a.shanten !== bestItem.shanten ||
                     Math.abs(a.totalAcceptCount - bestItem.totalAcceptCount) >= 2
      const isUserChoice = a.tile === userTile
      if (isDiff || isUserChoice) displayAnalysis.push(a)
      if (displayAnalysis.length >= 5) break
    }
    if (displayAnalysis.length === 1 && allFormatted.length > 1) {
      displayAnalysis.push(allFormatted[1])
    }

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

    this._handleResult(isCorrect)
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

    this.setData({
      confirmed: true,
      userAnswer: userLevel,
      isCorrect,
      explanation,
      correctLabel: result.label
    })

    this._handleResult(isCorrect)
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

    const maxAccept = s.analysis.length > 0 ? s.analysis[0].totalAcceptCount : 1
    const top5 = s.analysis.slice(0, 5).map(a => ({
      ...formatAnalysisItem(a),
      dangerLabel: a.maxDanger <= 30 ? '安全' : (a.maxDanger <= 60 ? '注意' : '危险'),
      dangerClass: a.maxDanger <= 30 ? 'safe' : (a.maxDanger <= 60 ? 'warn' : 'high'),
      barWidth: Math.round(a.totalAcceptCount / Math.max(maxAccept, 1) * 100)
    }))

    this.setData({
      confirmed: true,
      userAnswer: userTile,
      isCorrect,
      explanation,
      analysis: top5,
      bestTile,
      bestTileStr: tileToString(bestTile)
    })

    this._handleResult(isCorrect)
  },

  _handleResult(isCorrect) {
    if (isCorrect) {
      const newStreak = this.data.streak + 1
      const newBest = Math.max(newStreak, this.data.bestStreak)
      this.setData({ streak: newStreak, bestStreak: newBest })
    }
    // 答错时不立即game over，等用户点"下一题"或弹出复活
  },

  nextQuestion() {
    if (!this.data.isCorrect && !this.data.gameOver) {
      // 答错了，检查是否可以复活
      if (this.data.revivesUsed < MAX_REVIVES) {
        this.setData({ showRevivePopup: true })
        return
      } else {
        this._endGame()
        return
      }
    }
    this._generateQuestion()
  },

  // 选择看广告复活
  onRevive() {
    showRewardedAd().then(completed => {
      if (completed) {
        const used = this.data.revivesUsed + 1
        this.setData({
          revivesUsed: used,
          revivesLeft: MAX_REVIVES - used,
          showRevivePopup: false
        })
        // 跳过当前错题，继续下一题
        this._generateQuestion()
      } else {
        wx.showToast({ title: '广告未完成', icon: 'none' })
      }
    })
  },

  // 放弃复活
  onGiveUp() {
    this.setData({ showRevivePopup: false })
    this._endGame()
  },

  _endGame() {
    // 保存记录
    const stats = getStats()
    if (!stats.streakMode) {
      stats.streakMode = { bestStreak: 0, totalGames: 0 }
    }
    stats.streakMode.totalGames++
    stats.streakMode.bestStreak = Math.max(stats.streakMode.bestStreak, this.data.streak)
    saveStats(stats)

    this.setData({ gameOver: true })
  },

  // 重新开始
  restartGame() {
    this.setData({
      streak: 0,
      revivesUsed: 0,
      revivesLeft: MAX_REVIVES,
      gameOver: false,
      confirmed: false,
      showRevivePopup: false
    })
    this._generateQuestion()
  },

  goBack() {
    wx.navigateBack()
  }
})
