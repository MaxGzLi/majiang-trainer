App({
  globalData: {
    openId: ''
  },
  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({
        traceUser: true
      })
      this._getOpenId()
    }
  },
  _getOpenId() {
    // 先尝试缓存
    const cached = wx.getStorageSync('openId')
    if (cached) {
      this.globalData.openId = cached
      return
    }
    wx.cloud.callFunction({
      name: 'getOpenId'
    }).then(res => {
      const openId = res.result && res.result.openId
      if (openId) {
        this.globalData.openId = openId
        wx.setStorageSync('openId', openId)
      }
    }).catch(() => {})
  }
})
