const { generateQuestionSequence } = require('../../core/seeded-dealer')
const { tilesToHandArray, tileToString } = require('../../core/tiles')
const { generateExplanation, formatAnalysisItem } = require('../../core/analyzer')
const { explainSafety, explainDiscard, formatSafetyResult } = require('../../core/heqie-analyzer')
const { getStats, saveStats } = require('../../utils/storage')

Page({
  data: {
    roomId: '',
    // 进度
    myScore: 0,
    myCurrent: 0,
    opponentScore: 0,
    opponentCurrent: 0,
    totalQuestions: 20,
    myProgress: 0,
    opponentProgress: 0,
    // 题目
    questionType: '',
    // 何切
    tiles: [],
    selectedTile: -1,
    confirmed: false,
    bestTile: -1,
    isCorrect: false,
    // 河切
    myHand: [],
    rivers: [],
    openMelds: [],
    myFeeds: [],
    turnNumber: 0,
    targetTile: -1,
    targetTileStr: '',
    correctLabel: '',
    riverLabels: ['下家', '对家', '上家'],
    // 对战状态
    battleFinished: false,
    resultText: '',
    resultClass: '',
    opponentOffline: false,
    autoNextTimer: null
  },

  onLoad(options) {
    const { roomId, seed, difficulty, total } = options
    const totalQuestions = parseInt(total) || 20
    this._roomId = roomId
    this._seed = parseInt(seed)
    this._difficulty = difficulty || 'medium'
    this._totalQuestions = totalQuestions
    this._openId = getApp().globalData.openId

    // 用种子生成题目序列
    this._questions = generateQuestionSequence(this._seed, totalQuestions, this._difficulty)

    this.setData({ roomId, totalQuestions })

    // 监听房间状态
    this._watchRoom()
    // 开始第一题
    this._showQuestion(0)
    // 断线检测
    this._lastOpponentUpdate = Date.now()
    this._offlineCheckTimer = setInterval(() => this._checkOpponentOnline(), 15000)
  },

  onUnload() {
    if (this._watcher) {
      this._watcher.close()
      this._watcher = null
    }
    if (this._autoNextTimer) clearTimeout(this._autoNextTimer)
    if (this._offlineCheckTimer) clearInterval(this._offlineCheckTimer)
  },

  _watchRoom() {
    const db = wx.cloud.database()
    this._watcher = db.collection('rooms').where({ roomId: this._roomId }).watch({
      onChange: (snapshot) => {
        if (snapshot.docs.length > 0) {
          const room = snapshot.docs[0]
          const players = room.players
          // 找到对手
          for (const pid of Object.keys(players)) {
            if (pid !== this._openId) {
              this._lastOpponentUpdate = Date.now()
              this.setData({
                opponentScore: players[pid].score,
                opponentCurrent: players[pid].current,
                opponentProgress: Math.round(players[pid].current / this._totalQuestions * 100)
              })
              // 检查对手是否完成
              if (players[pid].finished && this.data.battleFinished === false) {
                // 对手已完成，我还没完成，继续答题
              }
              // 双方都完成
              if (players[pid].finished && this._myFinished) {
                this._showFinalResult()
              }
              break
            }
          }
        }
      },
      onError: () => {}
    })
  },

  _checkOpponentOnline() {
    const elapsed = Date.now() - this._lastOpponentUpdate
    if (elapsed > 120000 && !this.data.battleFinished) {
      // 2分钟无更新，判定离线获胜
      this._myFinished = true
      this._showFinalResult()
    } else if (elapsed > 60000 && !this.data.opponentOffline) {
      this.setData({ opponentOffline: true })
    }
  },

  _showQuestion(index) {
    if (index >= this._totalQuestions) {
      this._finishBattle()
      return
    }
    const q = this._questions[index]
    if (!q) {
      // 跳过空题
      this.setData({ myCurrent: index + 1, myProgress: Math.round((index + 1) / this._totalQuestions * 100) })
      this._showQuestion(index + 1)
      return
    }

    const data = {
      myCurrent: index,
      myProgress: Math.round(index / this._totalQuestions * 100),
      confirmed: false,
      selectedTile: -1,
      isCorrect: false,
      bestTile: -1,
      targetTile: -1,
      targetTileStr: '',
      correctLabel: '',
      tiles: [],
      myHand: [],
      rivers: [],
      openMelds: [],
      myFeeds: [],
      turnNumber: 0
    }

    if (q._qtype === 'practice' || q.tiles) {
      data.questionType = 'practice'
      data.tiles = q.tiles
      this._preAnalysis = q.analysis
      this._handArr = tilesToHandArray(q.tiles)
    } else if (q.questionType === 'safety') {
      data.questionType = 'safety'
      data.myHand = q.myHand
      data.rivers = q.rivers
      data.openMelds = q.openMelds
      data.myFeeds = q.myFeeds
      data.turnNumber = q.turnNumber
      data.targetTile = q.targetTile
      data.targetTileStr = tileToString(q.targetTile)
      this._scenario = q
    } else if (q.questionType === 'discard') {
      data.questionType = 'discard'
      data.myHand = q.myHand
      data.rivers = q.rivers
      data.openMelds = q.openMelds
      data.myFeeds = q.myFeeds
      data.turnNumber = q.turnNumber
      this._scenario = q
    }

    this.setData(data)
  },

  // 何切 & 河切弃牌
  onTileSelect(e) {
    if (this.data.confirmed) return
    const tileId = e.detail.tileId
    if (this.data.selectedTile === tileId) {
      if (this.data.questionType === 'practice') {
        this._confirmPractice(tileId)
      } else if (this.data.questionType === 'discard') {
        this._confirmDiscard(tileId)
      }
    } else {
      this.setData({ selectedTile: tileId })
    }
  },

  onSafetyChoice(e) {
    if (this.data.confirmed) return
    const level = parseInt(e.currentTarget.dataset.level)
    this._confirmSafety(level)
  },

  _confirmPractice(userTile) {
    const bestTile = this._preAnalysis[0].tile
    const isCorrect = userTile === bestTile
    const newScore = this.data.myScore + (isCorrect ? 1 : 0)

    this.setData({ confirmed: true, isCorrect, bestTile, myScore: newScore })
    this._reportProgress(newScore, this.data.myCurrent + 1, false)
    this._autoNext()
  },

  _confirmSafety(userLevel) {
    const s = this._scenario
    const isCorrect = userLevel === s.correctLevel
    const result = formatSafetyResult(s.correctDanger)
    const newScore = this.data.myScore + (isCorrect ? 1 : 0)

    this.setData({ confirmed: true, isCorrect, correctLabel: result.label, myScore: newScore })
    this._reportProgress(newScore, this.data.myCurrent + 1, false)
    this._autoNext()
  },

  _confirmDiscard(userTile) {
    const s = this._scenario
    const isCorrect = userTile === s.bestTile
    const newScore = this.data.myScore + (isCorrect ? 1 : 0)

    this.setData({ confirmed: true, isCorrect, bestTile: s.bestTile, myScore: newScore })
    this._reportProgress(newScore, this.data.myCurrent + 1, false)
    this._autoNext()
  },

  _autoNext() {
    this._autoNextTimer = setTimeout(() => {
      const nextIndex = this.data.myCurrent + 1
      this._showQuestion(nextIndex)
    }, 1500)
  },

  _reportProgress(score, current, finished) {
    wx.cloud.callFunction({
      name: 'updateProgress',
      data: {
        roomId: this._roomId,
        score,
        current,
        finished
      }
    }).catch(() => {})
  },

  _finishBattle() {
    this._myFinished = true
    const finalCurrent = this._totalQuestions
    this.setData({
      myCurrent: finalCurrent,
      myProgress: 100
    })
    this._reportProgress(this.data.myScore, finalCurrent, true)

    // 检查对手是否也完成了
    // watch 回调会处理双方完成的情况
    // 如果对手已经完成了，直接显示结果
    if (this.data.opponentCurrent >= this._totalQuestions) {
      this._showFinalResult()
    }
  },

  _showFinalResult() {
    if (this.data.battleFinished) return
    const myScore = this.data.myScore
    const opScore = this.data.opponentScore
    let resultText, resultClass

    if (myScore > opScore) {
      resultText = '你赢了！'
      resultClass = 'win'
      this._recordPkResult('win')
    } else if (myScore < opScore) {
      resultText = '你输了'
      resultClass = 'lose'
      this._recordPkResult('lose')
    } else {
      resultText = '平局'
      resultClass = 'draw'
      this._recordPkResult('draw')
    }

    this.setData({ battleFinished: true, resultText, resultClass })

    if (this._watcher) {
      this._watcher.close()
      this._watcher = null
    }
    if (this._offlineCheckTimer) clearInterval(this._offlineCheckTimer)
  },

  _recordPkResult(outcome) {
    const stats = getStats()
    if (!stats.pkMode) stats.pkMode = { wins: 0, losses: 0, draws: 0 }
    if (outcome === 'win') stats.pkMode.wins++
    else if (outcome === 'lose') stats.pkMode.losses++
    else stats.pkMode.draws++
    saveStats(stats)
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.redirectTo({ url: '/pages/index/index' }) })
  },

  onShareAppMessage() {
    return {
      title: '来切磋杭州麻将！',
      path: '/pages/pk/pk?roomId=' + this._roomId
    }
  }
})
