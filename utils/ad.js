// 激励视频广告
// 替换为真实 adUnitId 后，复活将自动切换为看广告模式
// 在微信公众平台 → 流量主 中申请（需累计 1000+ 独立用户）
const AD_UNIT_ID = ''

let rewardedAd = null

function getRewardedAd() {
  if (!AD_UNIT_ID) return null
  if (!rewardedAd && wx.createRewardedVideoAd) {
    rewardedAd = wx.createRewardedVideoAd({ adUnitId: AD_UNIT_ID })
  }
  return rewardedAd
}

/**
 * 尝试展示激励视频广告
 * - 未配置广告位时：直接返回 true（免费复活）
 * - 已配置广告位时：展示广告，看完返回 true
 */
function showRewardedAd() {
  return new Promise((resolve) => {
    const ad = getRewardedAd()
    if (!ad) {
      resolve(true)
      return
    }
    const onClose = (res) => {
      ad.offClose(onClose)
      resolve(res && res.isEnded)
    }
    ad.onClose(onClose)
    ad.show().catch(() => {
      ad.load().then(() => ad.show()).catch(() => {
        ad.offClose(onClose)
        resolve(false)
      })
    })
  })
}

/** 广告是否已配置（用于 UI 显示不同文案） */
function isAdEnabled() {
  return !!AD_UNIT_ID
}

module.exports = { showRewardedAd, isAdEnabled }
