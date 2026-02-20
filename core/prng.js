// mulberry32 种子随机数算法
// 保证同一 seed 产生完全一致的随机序列
function createRng(seed) {
  if (seed == null) seed = Date.now() ^ (Math.random() * 0xFFFFFFFF)
  let s = seed | 0
  const next = () => {
    s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return { next, seed }
}

module.exports = { createRng }
