const { showRewardedAd } = require('../../utils/ad')

Page({
  data: {
    // 页面状态: 'menu' | 'waiting' | 'joining' | 'countdown'
    pageState: 'menu',
    roomId: '',
    inputRoomId: '',
    countdown: 3,
    remainingAttempts: 2,
    loading: false,
    errorMsg: ''
  },

  onLoad(options) {
    // 通过分享链接直接加入
    if (options.roomId) {
      this.setData({ inputRoomId: options.roomId })
      this._joinRoom(options.roomId)
    } else {
      this._checkDailyAttempts()
    }
  },

  onUnload() {
    if (this._watcher) {
      this._watcher.close()
      this._watcher = null
    }
    if (this._countdownTimer) {
      clearInterval(this._countdownTimer)
    }
  },

  _checkDailyAttempts() {
    wx.cloud.callFunction({ name: 'getDailyAttempts' }).then(res => {
      this.setData({ remainingAttempts: res.result.remaining })
    }).catch(() => {})
  },

  // 创建房间
  onCreateRoom() {
    if (this.data.loading) return
    if (this.data.remainingAttempts <= 0) {
      this._showAdForAttempt(() => this._doCreateRoom())
      return
    }
    this._doCreateRoom()
  },

  _doCreateRoom() {
    this.setData({ loading: true, errorMsg: '' })
    wx.cloud.callFunction({
      name: 'createRoom',
      data: { difficulty: 'medium' }
    }).then(res => {
      if (res.result.success) {
        this._roomSeed = res.result.seed
        this.setData({
          pageState: 'waiting',
          roomId: res.result.roomId,
          loading: false
        })
        this._recordAttempt()
        this._watchRoom(res.result.roomId)
      } else {
        this.setData({ loading: false, errorMsg: res.result.error })
      }
    }).catch(err => {
      this.setData({ loading: false, errorMsg: '创建失败，请重试' })
    })
  },

  // 加入房间
  onJoinInput(e) {
    this.setData({ inputRoomId: e.detail.value.toUpperCase() })
  },

  onJoinRoom() {
    const roomId = this.data.inputRoomId.trim()
    if (!roomId || roomId.length !== 6) {
      this.setData({ errorMsg: '请输入6位房间号' })
      return
    }
    if (this.data.remainingAttempts <= 0) {
      this._showAdForAttempt(() => this._joinRoom(roomId))
      return
    }
    this._joinRoom(roomId)
  },

  _joinRoom(roomId) {
    this.setData({ loading: true, errorMsg: '', pageState: 'joining' })
    wx.cloud.callFunction({
      name: 'joinRoom',
      data: { roomId }
    }).then(res => {
      if (res.result.success) {
        this._roomSeed = res.result.seed
        this._roomDifficulty = res.result.difficulty
        this._totalQuestions = res.result.totalQuestions
        this.setData({ roomId, loading: false })
        this._recordAttempt()
        this._startCountdown()
      } else {
        this.setData({ loading: false, pageState: 'menu', errorMsg: res.result.error })
      }
    }).catch(() => {
      this.setData({ loading: false, pageState: 'menu', errorMsg: '加入失败，请重试' })
    })
  },

  _recordAttempt() {
    wx.cloud.callFunction({ name: 'recordAttempt' }).catch(() => {})
  },

  _showAdForAttempt(callback) {
    wx.showModal({
      title: '今日免费次数已用完',
      content: '看广告获取额外PK机会',
      confirmText: '看广告',
      cancelText: '取消'
    }).then(res => {
      if (res.confirm) {
        showRewardedAd().then(completed => {
          if (completed) {
            this.setData({ remainingAttempts: 1 })
            callback()
          }
        })
      }
    })
  },

  // 监听房间状态变化（创建者等待对手加入）
  _watchRoom(roomId) {
    const db = wx.cloud.database()
    this._watcher = db.collection('rooms').where({ roomId }).watch({
      onChange: (snapshot) => {
        if (snapshot.docs.length > 0) {
          const room = snapshot.docs[0]
          if (room.status === 'playing') {
            // 对手已加入
            this._roomSeed = room.seed
            this._roomDifficulty = room.difficulty
            this._totalQuestions = room.totalQuestions
            if (this._watcher) {
              this._watcher.close()
              this._watcher = null
            }
            this._startCountdown()
          }
        }
      },
      onError: () => {}
    })
  },

  _startCountdown() {
    this.setData({ pageState: 'countdown', countdown: 3 })
    this._countdownTimer = setInterval(() => {
      const next = this.data.countdown - 1
      if (next <= 0) {
        clearInterval(this._countdownTimer)
        this._goToBattle()
      } else {
        this.setData({ countdown: next })
      }
    }, 1000)
  },

  _goToBattle() {
    wx.redirectTo({
      url: `/pages/pk-battle/pk-battle?roomId=${this.data.roomId}&seed=${this._roomSeed}&difficulty=${this._roomDifficulty || 'medium'}&total=${this._totalQuestions || 20}`
    })
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '来切磋杭州麻将！',
      path: '/pages/pk/pk?roomId=' + this.data.roomId
    }
  },

  goBack() {
    wx.navigateBack()
  }
})
