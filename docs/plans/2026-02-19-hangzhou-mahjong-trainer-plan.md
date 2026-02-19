# 杭州麻将何切训练器 - 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 构建一个微信小程序，通过何切练习训练用户的杭州麻将牌效率判断能力。

**Architecture:** 纯前端微信小程序，核心引擎(core/)处理麻将逻辑计算，页面层(pages/)负责UI交互，组件层(components/)提供可复用的牌面展示。所有计算在客户端完成，练习记录使用微信本地存储。

**Tech Stack:** 微信小程序原生框架(WXML/WXSS/JS)，无外部依赖。

---

## Task 1: 项目初始化与牌面定义

**Files:**
- Create: `app.js`, `app.json`, `app.wxss`, `project.config.json`
- Create: `core/tiles.js`
- Create: `core/__tests__/tiles.test.js`

**Step 1: 初始化微信小程序项目骨架**

`app.json`:
```json
{
  "pages": [
    "pages/index/index",
    "pages/practice/practice",
    "pages/result/result",
    "pages/stats/stats"
  ],
  "window": {
    "backgroundTextStyle": "dark",
    "navigationBarBackgroundColor": "#1a6b3c",
    "navigationBarTitleText": "杭州麻将何切训练",
    "navigationBarTextStyle": "white"
  }
}
```

`app.js`:
```js
App({
  globalData: {}
})
```

`app.wxss`:
```css
page {
  background-color: #0d5a2a;
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif;
}
```

`project.config.json`:
```json
{
  "miniprogramRoot": "./",
  "setting": {
    "es6": true,
    "enhance": true
  },
  "appid": "",
  "projectname": "majiang-trainer"
}
```

**Step 2: 实现牌面定义模块 `core/tiles.js`**

```js
// 牌面ID: 0-33，每种4张，共136张
// 万:0-8, 筒:9-17, 条:18-26, 风:27-30(东南西北), 箭:31-33(中发白)
// 白板(33) = 财神

const SUIT_NAMES = ['万', '筒', '条']
const WIND_NAMES = ['东', '南', '西', '北']
const DRAGON_NAMES = ['中', '发', '白']
const JOKER_ID = 33 // 白板=财神

function tileToString(id) {
  if (id <= 8) return `${id + 1}万`
  if (id <= 17) return `${id - 8}筒`
  if (id <= 26) return `${id - 17}条`
  if (id <= 30) return WIND_NAMES[id - 27] + '风'
  return DRAGON_NAMES[id - 31]
}

function isJoker(id) {
  return id === JOKER_ID
}

// 是否为数牌(万筒条)
function isNumeric(id) {
  return id <= 26
}

// 获取花色: 0=万, 1=筒, 2=条, 3=风, 4=箭
function getSuit(id) {
  if (id <= 8) return 0
  if (id <= 17) return 1
  if (id <= 26) return 2
  if (id <= 30) return 3
  return 4
}

// 获取数牌的数字(1-9)，字牌返回-1
function getNumber(id) {
  if (id <= 8) return id + 1
  if (id <= 17) return id - 8
  if (id <= 26) return id - 17
  return -1
}

// 手牌用34长度数组表示，每个位置记录该牌的张数
function createHandArray() {
  return new Array(34).fill(0)
}

// 从牌ID列表转为手牌数组
function tilesToHandArray(tiles) {
  const hand = createHandArray()
  for (const t of tiles) hand[t]++
  return hand
}

// 从手牌数组转为牌ID列表(排序后)
function handArrayToTiles(hand) {
  const tiles = []
  for (let i = 0; i < 34; i++) {
    for (let j = 0; j < hand[i]; j++) tiles.push(i)
  }
  return tiles
}

// 生成完整牌墙(136张)
function createWall() {
  const wall = []
  for (let i = 0; i < 34; i++) {
    for (let j = 0; j < 4; j++) wall.push(i)
  }
  return wall
}

// 洗牌
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

module.exports = {
  JOKER_ID, SUIT_NAMES, WIND_NAMES, DRAGON_NAMES,
  tileToString, isJoker, isNumeric, getSuit, getNumber,
  createHandArray, tilesToHandArray, handArrayToTiles,
  createWall, shuffle
}
```

**Step 3: 编写 tiles 单元测试 `core/__tests__/tiles.test.js`**

```js
const tiles = require('../tiles')

// 可在Node环境用简易assert运行
function assert(condition, msg) {
  if (!condition) throw new Error('FAIL: ' + msg)
}

function runTests() {
  // tileToString
  assert(tiles.tileToString(0) === '1万', 'tileToString 0')
  assert(tiles.tileToString(8) === '9万', 'tileToString 8')
  assert(tiles.tileToString(9) === '1筒', 'tileToString 9')
  assert(tiles.tileToString(18) === '1条', 'tileToString 18')
  assert(tiles.tileToString(27) === '东风', 'tileToString 27')
  assert(tiles.tileToString(31) === '中', 'tileToString 31')
  assert(tiles.tileToString(33) === '白', 'tileToString 33')

  // isJoker
  assert(tiles.isJoker(33) === true, 'isJoker 33')
  assert(tiles.isJoker(0) === false, 'isJoker 0')

  // getSuit
  assert(tiles.getSuit(0) === 0, 'getSuit wan')
  assert(tiles.getSuit(9) === 1, 'getSuit tong')
  assert(tiles.getSuit(18) === 2, 'getSuit tiao')
  assert(tiles.getSuit(27) === 3, 'getSuit feng')
  assert(tiles.getSuit(31) === 4, 'getSuit jian')

  // getNumber
  assert(tiles.getNumber(0) === 1, 'getNumber 1wan')
  assert(tiles.getNumber(8) === 9, 'getNumber 9wan')
  assert(tiles.getNumber(27) === -1, 'getNumber feng')

  // tilesToHandArray / handArrayToTiles 互转
  const input = [0, 0, 0, 1, 2, 9, 9, 18, 33]
  const hand = tiles.tilesToHandArray(input)
  assert(hand[0] === 3, 'hand count 0')
  assert(hand[9] === 2, 'hand count 9')
  assert(hand[33] === 1, 'hand count 33')
  const output = tiles.handArrayToTiles(hand)
  assert(JSON.stringify(output) === JSON.stringify(input), 'roundtrip')

  // createWall
  const wall = tiles.createWall()
  assert(wall.length === 136, 'wall length')

  console.log('All tiles tests passed!')
}

runTests()
```

**Step 4: 运行测试验证**

Run: `cd /Users/guanzhang/vibe_coding_project/majiang && node core/__tests__/tiles.test.js`
Expected: "All tiles tests passed!"

**Step 5: 提交**

```bash
git init && git add -A && git commit -m "feat: project init and tile definitions"
```

---

## Task 2: 向听数计算（不含财神）

**Files:**
- Create: `core/shanten.js`
- Create: `core/__tests__/shanten.test.js`

**Step 1: 实现普通牌型向听数计算 `core/shanten.js`**

核心算法：遍历所有可能的面子/搭子拆分，取最小向听数。

```js
// 向听数计算
// 普通胡牌: 4面子+1将, 向听数 = 8 - 2*面子 - 搭子
// 七对: 向听数 = 6 - 对子数

const { JOKER_ID, isNumeric } = require('./tiles')

// 普通牌型向听数（递归拆分法）
function calcRegularShanten(hand) {
  let best = 8 // 最差情况
  // 尝试每种牌做将
  for (let i = 0; i < 34; i++) {
    if (hand[i] >= 2) {
      hand[i] -= 2
      const s = 8 - 2 * _countMentsu(hand, 0, 0, 0)
      // s = 8 - 2*面子 - 搭子 - 1(将已选)
      best = Math.min(best, s - 1)
      hand[i] += 2
    }
  }
  // 不选将的情况
  const s = 8 - 2 * _countMentsu(hand, 0, 0, 0)
  best = Math.min(best, s)
  return best
}

// 递归统计面子+搭子（返回 面子*2+搭子 的最大值，但搭子<=4-面子）
function _countMentsu(hand, startIdx, mentsu, partial) {
  let best = mentsu * 2 + Math.min(partial, 4 - mentsu)

  for (let i = startIdx; i < 34; i++) {
    if (hand[i] === 0) continue

    // 刻子
    if (hand[i] >= 3) {
      hand[i] -= 3
      const v = _countMentsu(hand, i, mentsu + 1, partial)
      best = Math.max(best, v)
      hand[i] += 3
    }

    // 顺子（仅数牌，且不能跨花色）
    if (isNumeric(i) && i % 9 <= 6 && hand[i + 1] > 0 && hand[i + 2] > 0) {
      hand[i]--; hand[i + 1]--; hand[i + 2]--
      const v = _countMentsu(hand, i, mentsu + 1, partial)
      best = Math.max(best, v)
      hand[i]++; hand[i + 1]++; hand[i + 2]++
    }

    // 对子搭子
    if (hand[i] >= 2) {
      hand[i] -= 2
      const v = _countMentsu(hand, i, mentsu, partial + 1)
      best = Math.max(best, v)
      hand[i] += 2
    }

    // 两面/嵌张搭子
    if (isNumeric(i) && i % 9 <= 7 && hand[i + 1] > 0) {
      hand[i]--; hand[i + 1]--
      const v = _countMentsu(hand, i, mentsu, partial + 1)
      best = Math.max(best, v)
      hand[i]++; hand[i + 1]++
    }

    // 坎张搭子
    if (isNumeric(i) && i % 9 <= 6 && hand[i + 2] > 0) {
      hand[i]--; hand[i + 2]--
      const v = _countMentsu(hand, i, mentsu, partial + 1)
      best = Math.max(best, v)
      hand[i]++; hand[i + 2]++
    }

    // 关键优化：遇到第一张非零牌就break，只从最前面开始拆
    break
  }

  return best
}

// 七对向听数
function calcSevenPairsShanten(hand) {
  let pairs = 0
  let types = 0
  for (let i = 0; i < 34; i++) {
    if (hand[i] >= 2) pairs += Math.floor(hand[i] / 2)
    if (hand[i] > 0) types++
  }
  // 需要7种不同的对子
  pairs = Math.min(pairs, 7)
  if (types < 7) pairs = Math.min(pairs, types)
  return 6 - pairs
}

// 综合向听数（不含财神）
function calcShanten(hand) {
  const total = hand.reduce((s, v) => s + v, 0)
  // 13张牌计算向听，14张牌可能已经胡了(-1)
  const regular = calcRegularShanten(hand)
  const qidui = total >= 13 ? calcSevenPairsShanten(hand) : 99
  return Math.min(regular, qidui)
}

module.exports = { calcShanten, calcRegularShanten, calcSevenPairsShanten }
```

**Step 2: 编写向听数测试 `core/__tests__/shanten.test.js`**

```js
const { calcShanten } = require('../shanten')
const { tilesToHandArray } = require('../tiles')

function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg)
}

function runTests() {
  // 已胡牌: 123万 456万 789万 123筒 1筒1筒(将)
  let h = tilesToHandArray([0,1,2, 3,4,5, 6,7,8, 9,10,11, 9,9])
  assert(calcShanten(h) === -1, '已胡牌 shanten=-1, got ' + calcShanten(h))

  // 听牌(0向听): 123万 456万 789万 12筒 1筒(缺3筒或将)
  h = tilesToHandArray([0,1,2, 3,4,5, 6,7,8, 9,10, 9])
  // 有3组顺子+1搭子+1单张, 差1步
  // 实际: 4面子已有3个(123万,456万,789万), 搭子12筒, 单张1筒
  // 如果1筒做将配12筒搭子 → 听3筒 → 0向听
  assert(calcShanten(h) === 0, '听牌 shanten=0, got ' + calcShanten(h))

  // 一向听: 12万 45万 78万 12筒 55条
  h = tilesToHandArray([0,1, 3,4, 6,7, 9,10, 22,22])
  // 3搭子+1将+剩余, 需要再进2张变4面子+将
  // 10张牌，需要13张来测，补几张
  // 用正确的13张例子：12万 456万 78万 12筒 55条
  h = tilesToHandArray([0,1, 3,4,5, 6,7, 9,10, 22,22, 22])
  const s1 = calcShanten(h)
  assert(s1 >= 0 && s1 <= 2, '一向听范围, got ' + s1)

  // 七对听牌: 11万 22万 33万 44万 55万 66万 7万
  h = tilesToHandArray([0,0, 1,1, 2,2, 3,3, 4,4, 5,5, 6])
  // 6对+1单张 = 听牌(0向听)
  assert(calcShanten(h) === 0, '七对听牌 shanten=0, got ' + calcShanten(h))

  // 七对胡牌: 11万 22万 33万 44万 55万 66万 77万
  h = tilesToHandArray([0,0, 1,1, 2,2, 3,3, 4,4, 5,5, 6,6])
  assert(calcShanten(h) === -1, '七对胡牌 shanten=-1, got ' + calcShanten(h))

  console.log('All shanten tests passed!')
}

runTests()
```

**Step 3: 运行测试**

Run: `node core/__tests__/shanten.test.js`
Expected: "All shanten tests passed!"

**Step 4: 提交**

```bash
git add core/shanten.js core/__tests__/shanten.test.js
git commit -m "feat: shanten calculation for regular and seven-pairs"
```

---

## Task 3: 财神(百搭)向听数计算

**Files:**
- Modify: `core/shanten.js` — 添加财神处理逻辑
- Modify: `core/__tests__/shanten.test.js` — 添加财神测试

**Step 1: 在 `core/shanten.js` 中添加财神向听数计算**

在 `calcShanten` 函数之前添加：

```js
// 含财神的向听数计算
// 思路：财神从手牌中移除，计算无财神向听数，每张财神减1
function calcShantenWithJoker(hand) {
  const jokerCount = hand[JOKER_ID]
  hand[JOKER_ID] = 0

  const regular = calcRegularShanten(hand)
  const total = hand.reduce((s, v) => s + v, 0) + jokerCount
  const qidui = total >= 13 ? calcSevenPairsWithJoker(hand, jokerCount) : 99

  hand[JOKER_ID] = jokerCount // 恢复

  const base = Math.min(regular, qidui)
  return Math.max(base - jokerCount, -1) // 每张财神减1向听，最小-1
}

// 七对+财神
function calcSevenPairsWithJoker(hand, jokerCount) {
  let pairs = 0
  let singles = 0
  for (let i = 0; i < 34; i++) {
    if (i === JOKER_ID) continue
    pairs += Math.floor(hand[i] / 2)
    if (hand[i] % 2 === 1) singles++
  }
  // 财神可以和单张配对
  const jokerPairs = Math.min(jokerCount, singles)
  pairs += jokerPairs
  const remainJokers = jokerCount - jokerPairs
  // 剩余财神两两配对
  pairs += Math.floor(remainJokers / 2)
  pairs = Math.min(pairs, 7)
  return 6 - pairs
}
```

修改 module.exports 添加 `calcShantenWithJoker`。

**Step 2: 添加财神测试到 `core/__tests__/shanten.test.js`**

```js
// 财神测试
// 12万 45万 78万 12筒 55条 + 1财神(13张)
h = tilesToHandArray([0,1, 3,4, 6,7, 9,10, 22,22, 33])
const sj = calcShantenWithJoker(h)
// 财神可替代任意1张，应减少1向听
assert(sj >= -1 && sj <= 1, '财神向听, got ' + sj)

// 2张财神 + 好牌: 123万 456万 789万 1筒 + 2财神
h = tilesToHandArray([0,1,2, 3,4,5, 6,7,8, 9, 33,33])
// 无财神: 3面子 + 1单张 = 很好的牌型
// 2财神可补: 做将+进张 → 应该听牌或已胡
const sj2 = calcShantenWithJoker(h)
assert(sj2 <= 0, '双财神好牌, got ' + sj2)

console.log('All shanten+joker tests passed!')
```

**Step 3: 运行测试**

Run: `node core/__tests__/shanten.test.js`
Expected: "All shanten+joker tests passed!"

**Step 4: 提交**

```bash
git add core/shanten.js core/__tests__/shanten.test.js
git commit -m "feat: shanten calculation with joker (caishen) support"
```

---

## Task 4: 有效进张分析

**Files:**
- Create: `core/efficiency.js`
- Create: `core/__tests__/efficiency.test.js`

**Step 1: 实现有效进张分析 `core/efficiency.js`**

```js
const { calcShantenWithJoker } = require('./shanten')
const { JOKER_ID, createHandArray } = require('./tiles')

// 分析打出某张牌后的牌效率
// hand: 34长度数组(14张牌), tileToDiscard: 要打的牌ID
// remainCount: 34长度数组，每种牌的剩余张数(牌墙+其他人手牌中的)
function analyzeDiscard(hand, tileToDiscard, remainCount) {
  hand[tileToDiscard]--
  const shantenAfter = calcShantenWithJoker(hand)

  // 计算有效进张：摸哪些牌能减少向听数
  let accepts = []
  let totalAcceptCount = 0

  for (let i = 0; i < 34; i++) {
    if (remainCount[i] <= 0) continue
    hand[i]++
    const newShanten = calcShantenWithJoker(hand)
    if (newShanten < shantenAfter) {
      accepts.push({ tile: i, count: remainCount[i] })
      totalAcceptCount += remainCount[i]
    }
    hand[i]--
  }

  hand[tileToDiscard]++ // 恢复
  return { shanten: shantenAfter, accepts, totalAcceptCount }
}

// 分析手牌中所有可打的牌，返回排序后的结果
// hand: 14张牌的数组, remainCount: 牌墙剩余
function analyzeAllDiscards(hand, remainCount) {
  const results = []
  const seen = new Set()

  for (let i = 0; i < 34; i++) {
    if (hand[i] <= 0) continue
    if (seen.has(i)) continue
    seen.add(i)

    const analysis = analyzeDiscard(hand, i, remainCount)
    results.push({
      tile: i,
      shanten: analysis.shanten,
      accepts: analysis.accepts,
      totalAcceptCount: analysis.totalAcceptCount
    })
  }

  // 排序：向听数小优先，同向听比进张数多优先
  results.sort((a, b) => {
    if (a.shanten !== b.shanten) return a.shanten - b.shanten
    return b.totalAcceptCount - a.totalAcceptCount
  })

  return results
}

// 生成默认剩余牌数(假设只看到自己手牌)
function calcRemainCount(hand) {
  const remain = new Array(34).fill(4)
  for (let i = 0; i < 34; i++) {
    remain[i] -= hand[i]
  }
  return remain
}

module.exports = { analyzeDiscard, analyzeAllDiscards, calcRemainCount }
```

**Step 2: 编写测试 `core/__tests__/efficiency.test.js`**

```js
const { analyzeAllDiscards, calcRemainCount } = require('../efficiency')
const { tilesToHandArray, tileToString } = require('../tiles')

function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg)
}

function runTests() {
  // 14张牌：123万 456万 789万 12筒 55条 → 打哪张？
  // 最优应该打5条（孤对），保留12筒搭子
  const h = tilesToHandArray([0,1,2, 3,4,5, 6,7,8, 9,10, 22,22, 22])
  // 这是13张不是14张，补1张: 加个8筒
  const h2 = tilesToHandArray([0,1,2, 3,4,5, 6,7,8, 9,10, 17, 22,22])
  const remain = calcRemainCount(h2)
  const results = analyzeAllDiscards(h2, remain)

  // 应该有多个选择
  assert(results.length > 0, '有分析结果')
  // 最优选择的向听数应该最小
  assert(results[0].shanten <= results[results.length - 1].shanten, '排序正确')
  // 最优选择应有进张
  assert(results[0].totalAcceptCount > 0, '最优选择有进张')

  console.log('Top 3 choices:')
  for (let i = 0; i < Math.min(3, results.length); i++) {
    const r = results[i]
    console.log(`  打${tileToString(r.tile)}: 向听${r.shanten}, 进张${r.totalAcceptCount}张`)
  }

  console.log('All efficiency tests passed!')
}

runTests()
```

**Step 3: 运行测试**

Run: `node core/__tests__/efficiency.test.js`
Expected: "All efficiency tests passed!" + 输出top 3选择

**Step 4: 提交**

```bash
git add core/efficiency.js core/__tests__/efficiency.test.js
git commit -m "feat: tile efficiency analysis for all discard options"
```

---

## Task 5: 发牌器（难度控制）

**Files:**
- Create: `core/dealer.js`
- Create: `core/__tests__/dealer.test.js`

**Step 1: 实现发牌器 `core/dealer.js`**

```js
const { createWall, shuffle, JOKER_ID, tilesToHandArray, handArrayToTiles } = require('./tiles')
const { calcShantenWithJoker } = require('./shanten')
const { analyzeAllDiscards, calcRemainCount } = require('./efficiency')

// 难度定义
const DIFFICULTY = {
  EASY: 'easy',     // 入门：无财神，一向听，最优解明显
  MEDIUM: 'medium', // 进阶：含财神，一到二向听
  HARD: 'hard'      // 高级：含财神，多路线判断
}

// 生成一手训练用牌（14张）
// 返回 { tiles: number[], difficulty: string } 或 null（生成失败重试）
function dealHand(difficulty, maxAttempts = 200) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const wall = shuffle(createWall())
    let hand = wall.slice(0, 14)

    // 按难度过滤
    const handArr = tilesToHandArray(hand)
    const jokerCount = handArr[JOKER_ID]
    const shanten = calcShantenWithJoker(handArr)

    let valid = false

    if (difficulty === DIFFICULTY.EASY) {
      // 入门：无财神，0-1向听
      valid = jokerCount === 0 && shanten >= 0 && shanten <= 1
    } else if (difficulty === DIFFICULTY.MEDIUM) {
      // 进阶：有1-2张财神，0-2向听
      valid = jokerCount >= 1 && jokerCount <= 2 && shanten >= 0 && shanten <= 2
    } else if (difficulty === DIFFICULTY.HARD) {
      // 高级：有财神，0-2向听，存在多路线
      valid = jokerCount >= 1 && shanten >= 0 && shanten <= 2
    }

    if (!valid) continue

    // 检查是否有训练价值：最优和次优选择的进张差距>=2
    const remain = calcRemainCount(handArr)
    const analysis = analyzeAllDiscards(handArr, remain)

    if (analysis.length < 2) continue

    const best = analysis[0]
    const second = analysis[1]

    // 入门难度要求差距更大（更明显）
    const minGap = difficulty === DIFFICULTY.EASY ? 4 : 2

    if (best.shanten < second.shanten ||
        (best.shanten === second.shanten && best.totalAcceptCount - second.totalAcceptCount >= minGap)) {
      hand.sort((a, b) => a - b)
      return { tiles: hand, difficulty, analysis }
    }
  }

  // 达到最大尝试次数，降低要求重试
  return dealHandFallback(difficulty)
}

// 降级发牌（不严格检查训练价值）
function dealHandFallback(difficulty) {
  for (let i = 0; i < 100; i++) {
    const wall = shuffle(createWall())
    const hand = wall.slice(0, 14)
    const handArr = tilesToHandArray(hand)
    const shanten = calcShantenWithJoker(handArr)

    if (shanten >= 0 && shanten <= 2) {
      hand.sort((a, b) => a - b)
      const remain = calcRemainCount(handArr)
      const analysis = analyzeAllDiscards(handArr, remain)
      return { tiles: hand, difficulty, analysis }
    }
  }
  return null
}

module.exports = { dealHand, DIFFICULTY }
```

**Step 2: 编写测试 `core/__tests__/dealer.test.js`**

```js
const { dealHand, DIFFICULTY } = require('../dealer')
const { tileToString, isJoker, tilesToHandArray } = require('../tiles')
const { calcShantenWithJoker } = require('../shanten')

function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg)
}

function runTests() {
  // 入门难度
  const easy = dealHand(DIFFICULTY.EASY)
  assert(easy !== null, '入门发牌成功')
  assert(easy.tiles.length === 14, '入门14张牌')
  assert(!easy.tiles.some(t => isJoker(t)), '入门无财神')
  const easyShanten = calcShantenWithJoker(tilesToHandArray(easy.tiles))
  assert(easyShanten >= 0 && easyShanten <= 1, '入门0-1向听')
  console.log('入门:', easy.tiles.map(tileToString).join(' '))

  // 进阶难度
  const med = dealHand(DIFFICULTY.MEDIUM)
  assert(med !== null, '进阶发牌成功')
  assert(med.tiles.length === 14, '进阶14张牌')
  assert(med.tiles.some(t => isJoker(t)), '进阶有财神')
  console.log('进阶:', med.tiles.map(tileToString).join(' '))

  // 高级难度
  const hard = dealHand(DIFFICULTY.HARD)
  assert(hard !== null, '高级发牌成功')
  assert(hard.tiles.length === 14, '高级14张牌')
  console.log('高级:', hard.tiles.map(tileToString).join(' '))

  // 分析结果存在
  assert(easy.analysis.length >= 2, '入门有分析')
  assert(med.analysis.length >= 2, '进阶有分析')

  console.log('All dealer tests passed!')
}

runTests()
```

**Step 3: 运行测试**

Run: `node core/__tests__/dealer.test.js`
Expected: "All dealer tests passed!" + 输出三种难度的手牌

**Step 4: 提交**

```bash
git add core/dealer.js core/__tests__/dealer.test.js
git commit -m "feat: difficulty-controlled hand dealer"
```

---

## Task 6: 解析文字生成

**Files:**
- Create: `core/analyzer.js`

**Step 1: 实现解析生成器 `core/analyzer.js`**

```js
const { tileToString, isJoker, isNumeric, getSuit, getNumber } = require('./tiles')

// 生成牌效分析解析文字
function generateExplanation(userChoice, bestChoice, analysis) {
  if (userChoice === bestChoice) {
    return '选择正确！你的判断和最优解一致。'
  }

  const userResult = analysis.find(a => a.tile === userChoice)
  const bestResult = analysis.find(a => a.tile === bestChoice)

  if (!userResult || !bestResult) return ''

  const parts = []

  // 向听数差异
  if (userResult.shanten > bestResult.shanten) {
    parts.push(`打${tileToString(userChoice)}会增加向听数(${bestResult.shanten}→${userResult.shanten})，离胡牌更远了。`)
  }

  // 进张数差异
  if (userResult.shanten === bestResult.shanten) {
    const diff = bestResult.totalAcceptCount - userResult.totalAcceptCount
    parts.push(`打${tileToString(bestChoice)}有${bestResult.totalAcceptCount}张有效进张，比打${tileToString(userChoice)}的${userResult.totalAcceptCount}张多${diff}张。`)
  }

  // 分析最优选择的原因
  parts.push(_explainWhy(bestChoice, bestResult))

  return parts.filter(Boolean).join('')
}

function _explainWhy(tile, result) {
  if (isJoker(tile)) {
    return '财神是万能牌，一般不轻易打出。但此时打出财神反而有更多进张选择。'
  }

  const num = getNumber(tile)
  if (num === -1) {
    // 字牌
    return `${tileToString(tile)}是孤张字牌，没有搭子配合，打出不影响手牌结构。`
  }

  if (num === 1 || num === 9) {
    return `${tileToString(tile)}是边张，能组成的搭子较少，优先级较低。`
  }

  if (result.totalAcceptCount > 0) {
    const acceptStr = result.accepts.slice(0, 3).map(a =>
      `${tileToString(a.tile)}(${a.count}张)`
    ).join('、')
    return `打出后可进${acceptStr}等牌。`
  }

  return ''
}

module.exports = { generateExplanation }
```

**Step 2: 提交**

```bash
git add core/analyzer.js
git commit -m "feat: discard explanation text generator"
```

---

## Task 7: 本地存储工具

**Files:**
- Create: `utils/storage.js`

**Step 1: 实现本地存储 `utils/storage.js`**

```js
const STORAGE_KEY = 'majiang_trainer_stats'

function getStats() {
  try {
    const data = wx.getStorageSync(STORAGE_KEY)
    return data || createDefaultStats()
  } catch (e) {
    return createDefaultStats()
  }
}

function saveStats(stats) {
  try {
    wx.setStorageSync(STORAGE_KEY, stats)
  } catch (e) {
    console.error('保存失败', e)
  }
}

function createDefaultStats() {
  return {
    totalCount: 0,
    correctCount: 0,
    streak: 0,
    maxStreak: 0,
    byDifficulty: {
      easy: { total: 0, correct: 0 },
      medium: { total: 0, correct: 0 },
      hard: { total: 0, correct: 0 }
    }
  }
}

function recordResult(stats, difficulty, isCorrect) {
  stats.totalCount++
  stats.byDifficulty[difficulty].total++
  if (isCorrect) {
    stats.correctCount++
    stats.byDifficulty[difficulty].correct++
    stats.streak++
    stats.maxStreak = Math.max(stats.maxStreak, stats.streak)
  } else {
    stats.streak = 0
  }
  saveStats(stats)
  return stats
}

module.exports = { getStats, saveStats, recordResult }
```

**Step 2: 提交**

```bash
git add utils/storage.js
git commit -m "feat: local storage for practice statistics"
```

---

## Task 8: 麻将牌UI组件

**Files:**
- Create: `components/tile/tile.wxml`
- Create: `components/tile/tile.wxss`
- Create: `components/tile/tile.js`
- Create: `components/tile/tile.json`

**Step 1: 创建麻将牌组件**

`components/tile/tile.json`:
```json
{
  "component": true
}
```

`components/tile/tile.js`:
```js
const { tileToString, isJoker, getSuit } = require('../../core/tiles')

Component({
  properties: {
    tileId: { type: Number, value: -1 },
    selected: { type: Boolean, value: false },
    disabled: { type: Boolean, value: false },
    showBest: { type: Boolean, value: false }
  },
  data: {
    label: '',
    suitClass: ''
  },
  observers: {
    'tileId': function(id) {
      if (id < 0) return
      const suit = getSuit(id)
      const suitClasses = ['wan', 'tong', 'tiao', 'feng', 'jian']
      this.setData({
        label: tileToString(id),
        suitClass: isJoker(id) ? 'joker' : suitClasses[suit]
      })
    }
  },
  methods: {
    onTap() {
      if (!this.data.disabled) {
        this.triggerEvent('tap', { tileId: this.data.tileId })
      }
    }
  }
})
```

`components/tile/tile.wxml`:
```xml
<view class="tile {{suitClass}} {{selected ? 'selected' : ''}} {{disabled ? 'disabled' : ''}} {{showBest ? 'best' : ''}}"
      bindtap="onTap">
  <text class="tile-label">{{label}}</text>
</view>
```

`components/tile/tile.wxss`:
```css
.tile {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72rpx;
  height: 100rpx;
  background: #f5f0e1;
  border: 2rpx solid #c8b88a;
  border-radius: 8rpx;
  margin: 4rpx;
  box-shadow: 2rpx 4rpx 6rpx rgba(0,0,0,0.3);
  transition: transform 0.15s, box-shadow 0.15s;
}
.tile-label {
  font-size: 28rpx;
  font-weight: bold;
}
.wan .tile-label { color: #1a5276; }
.tong .tile-label { color: #c0392b; }
.tiao .tile-label { color: #27ae60; }
.feng .tile-label, .jian .tile-label { color: #2c3e50; }
.joker .tile-label { color: #8e44ad; font-size: 24rpx; }
.joker { background: linear-gradient(135deg, #f5f0e1, #e8d5f5); }
.selected {
  transform: translateY(-16rpx);
  box-shadow: 0 8rpx 16rpx rgba(0,0,0,0.4);
  border-color: #e74c3c;
}
.best {
  border-color: #27ae60;
  box-shadow: 0 0 12rpx rgba(39,174,96,0.6);
}
.disabled {
  opacity: 0.6;
}
```

**Step 2: 提交**

```bash
git add components/tile/
git commit -m "feat: mahjong tile UI component"
```

---

## Task 9: 首页

**Files:**
- Create: `pages/index/index.wxml`, `index.wxss`, `index.js`, `index.json`

**Step 1: 实现首页**

`pages/index/index.json`:
```json
{ "navigationBarTitleText": "杭州麻将何切训练" }
```

`pages/index/index.js`:
```js
const { getStats } = require('../../utils/storage')

Page({
  data: {
    difficulty: 'easy',
    stats: null
  },
  onShow() {
    this.setData({ stats: getStats() })
  },
  selectDifficulty(e) {
    this.setData({ difficulty: e.currentTarget.dataset.level })
  },
  startPractice() {
    wx.navigateTo({
      url: `/pages/practice/practice?difficulty=${this.data.difficulty}`
    })
  },
  goStats() {
    wx.navigateTo({ url: '/pages/stats/stats' })
  }
})
```

`pages/index/index.wxml`:
```xml
<view class="container">
  <view class="title">杭州麻将</view>
  <view class="subtitle">何切训练器</view>

  <view class="diff-section">
    <view class="diff-label">选择难度</view>
    <view class="diff-buttons">
      <view class="diff-btn {{difficulty === 'easy' ? 'active' : ''}}"
            data-level="easy" bindtap="selectDifficulty">入门</view>
      <view class="diff-btn {{difficulty === 'medium' ? 'active' : ''}}"
            data-level="medium" bindtap="selectDifficulty">进阶</view>
      <view class="diff-btn {{difficulty === 'hard' ? 'active' : ''}}"
            data-level="hard" bindtap="selectDifficulty">高级</view>
    </view>
  </view>

  <view class="start-btn" bindtap="startPractice">开始练习</view>

  <view class="stats-preview" wx:if="{{stats && stats.totalCount > 0}}" bindtap="goStats">
    <text>已练习 {{stats.totalCount}} 题</text>
    <text>正确率 {{stats.totalCount > 0 ? Math.round(stats.correctCount / stats.totalCount * 100) : 0}}%</text>
  </view>
</view>
```

`pages/index/index.wxss`:
```css
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 40rpx 40rpx;
  min-height: 100vh;
}
.title {
  font-size: 56rpx;
  font-weight: bold;
  color: #f0e6d2;
}
.subtitle {
  font-size: 36rpx;
  color: #a8d8a8;
  margin-bottom: 80rpx;
}
.diff-section {
  width: 100%;
  margin-bottom: 60rpx;
}
.diff-label {
  text-align: center;
  font-size: 28rpx;
  color: #a8d8a8;
  margin-bottom: 20rpx;
}
.diff-buttons {
  display: flex;
  justify-content: center;
  gap: 20rpx;
}
.diff-btn {
  padding: 16rpx 40rpx;
  border: 2rpx solid #a8d8a8;
  border-radius: 8rpx;
  font-size: 28rpx;
  color: #a8d8a8;
}
.diff-btn.active {
  background: #a8d8a8;
  color: #0d5a2a;
  font-weight: bold;
}
.start-btn {
  width: 400rpx;
  height: 88rpx;
  background: #e8c840;
  color: #2c1810;
  font-size: 36rpx;
  font-weight: bold;
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 60rpx;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.3);
}
.stats-preview {
  display: flex;
  gap: 40rpx;
  font-size: 26rpx;
  color: #a8d8a8;
  padding: 20rpx;
}
```

**Step 2: 提交**

```bash
git add pages/index/
git commit -m "feat: home page with difficulty selection"
```

---

## Task 10: 练习页

**Files:**
- Create: `pages/practice/practice.wxml`, `practice.wxss`, `practice.js`, `practice.json`

**Step 1: 实现练习页**

`pages/practice/practice.json`:
```json
{
  "navigationBarTitleText": "何切练习",
  "usingComponents": { "tile": "/components/tile/tile" }
}
```

`pages/practice/practice.js`:
```js
const { dealHand, DIFFICULTY } = require('../../core/dealer')
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
    questionNum: 1
  },
  onLoad(options) {
    this.setData({ difficulty: options.difficulty || 'easy' })
    this.newQuestion()
  },
  newQuestion() {
    const result = dealHand(this.data.difficulty)
    if (!result) {
      wx.showToast({ title: '发牌失败，请重试', icon: 'none' })
      return
    }
    this.setData({
      tiles: result.tiles,
      selectedTile: -1,
      confirmed: false,
      analysis: [],
      bestTile: -1,
      userTile: -1,
      isCorrect: false,
      explanation: ''
    })
    // 预计算分析结果
    this._preAnalysis = result.analysis
  },
  onTileSelect(e) {
    if (this.data.confirmed) return
    const tileId = e.detail.tileId
    if (this.data.selectedTile === tileId) {
      // 二次点击 = 确认
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

    // 记录结果
    const stats = getStats()
    recordResult(stats, this.data.difficulty, isCorrect)

    this.setData({
      confirmed: true,
      analysis: analysis.slice(0, 5), // 显示前5个选择
      bestTile,
      userTile,
      isCorrect,
      explanation
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
```

`pages/practice/practice.wxml`:
```xml
<view class="container">
  <view class="header">
    <text class="q-num">第 {{questionNum}} 题</text>
    <text class="diff-tag">{{difficulty === 'easy' ? '入门' : difficulty === 'medium' ? '进阶' : '高级'}}</text>
  </view>

  <view class="prompt" wx:if="{{!confirmed}}">请选择要打出的牌（点击选中，再次点击确认）</view>

  <view class="hand">
    <tile wx:for="{{tiles}}" wx:key="index"
          tileId="{{item}}"
          selected="{{selectedTile === item && !confirmed}}"
          showBest="{{confirmed && item === bestTile}}"
          disabled="{{confirmed}}"
          bind:tap="onTileSelect" />
  </view>

  <block wx:if="{{confirmed}}">
    <view class="result {{isCorrect ? 'correct' : 'wrong'}}">
      <text class="result-icon">{{isCorrect ? '✓' : '✗'}}</text>
      <text class="result-text">{{isCorrect ? '正确！' : '可以更优'}}</text>
    </view>

    <view class="comparison">
      <view class="comp-row" wx:if="{{!isCorrect}}">
        <text class="comp-label">你的选择：</text>
        <text>打 {{tiles[userTile] !== undefined ? userTile : ''}}{{userTileStr}}</text>
      </view>
      <view class="comp-row">
        <text class="comp-label">最优选择：</text>
        <text class="best-text">打 {{bestTileStr}}</text>
      </view>
    </view>

    <view class="analysis-list">
      <view class="analysis-title">牌效对比</view>
      <view class="analysis-item {{item.tile === bestTile ? 'best-item' : ''}} {{item.tile === userTile ? 'user-item' : ''}}"
            wx:for="{{analysis}}" wx:key="tile">
        <text class="a-tile">打{{item.tileStr}}</text>
        <text class="a-shanten">向听{{item.shanten}}</text>
        <text class="a-count">进张{{item.totalAcceptCount}}张</text>
      </view>
    </view>

    <view class="explanation" wx:if="{{explanation}}">
      <text class="exp-label">解析</text>
      <text class="exp-text">{{explanation}}</text>
    </view>

    <view class="actions">
      <view class="next-btn" bindtap="nextQuestion">下一题</view>
      <view class="back-btn" bindtap="goBack">返回首页</view>
    </view>
  </block>
</view>
```

`pages/practice/practice.wxss`:
```css
.container { padding: 20rpx; }
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}
.q-num { font-size: 32rpx; color: #f0e6d2; }
.diff-tag {
  font-size: 24rpx;
  padding: 6rpx 16rpx;
  background: rgba(168,216,168,0.2);
  color: #a8d8a8;
  border-radius: 6rpx;
}
.prompt {
  text-align: center;
  font-size: 26rpx;
  color: #a8d8a8;
  margin-bottom: 30rpx;
}
.hand {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  padding: 20rpx 0 30rpx;
}
.result {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 24rpx;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
}
.result.correct { background: rgba(39,174,96,0.2); }
.result.wrong { background: rgba(231,76,60,0.2); }
.result-icon { font-size: 40rpx; }
.result.correct .result-icon { color: #27ae60; }
.result.wrong .result-icon { color: #e74c3c; }
.result-text { font-size: 32rpx; font-weight: bold; }
.comparison { margin-bottom: 20rpx; padding: 0 20rpx; }
.comp-row {
  display: flex;
  gap: 12rpx;
  font-size: 28rpx;
  margin-bottom: 8rpx;
}
.comp-label { color: #a8d8a8; }
.best-text { color: #27ae60; font-weight: bold; }
.analysis-list {
  background: rgba(255,255,255,0.05);
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
}
.analysis-title {
  font-size: 26rpx;
  color: #a8d8a8;
  margin-bottom: 12rpx;
}
.analysis-item {
  display: flex;
  justify-content: space-between;
  padding: 12rpx 16rpx;
  font-size: 26rpx;
  border-radius: 6rpx;
  margin-bottom: 6rpx;
}
.best-item { background: rgba(39,174,96,0.15); color: #27ae60; }
.user-item { border: 1rpx solid rgba(231,76,60,0.3); }
.explanation {
  background: rgba(232,200,64,0.1);
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 30rpx;
}
.exp-label {
  display: block;
  font-size: 24rpx;
  color: #e8c840;
  margin-bottom: 8rpx;
}
.exp-text { font-size: 26rpx; line-height: 1.6; }
.actions {
  display: flex;
  justify-content: center;
  gap: 30rpx;
}
.next-btn {
  padding: 16rpx 60rpx;
  background: #e8c840;
  color: #2c1810;
  font-size: 30rpx;
  font-weight: bold;
  border-radius: 40rpx;
}
.back-btn {
  padding: 16rpx 40rpx;
  border: 2rpx solid #a8d8a8;
  color: #a8d8a8;
  font-size: 30rpx;
  border-radius: 40rpx;
}
```

**Step 2: 提交**

```bash
git add pages/practice/
git commit -m "feat: practice page with tile selection and analysis display"
```

---

## Task 11: 统计页

**Files:**
- Create: `pages/stats/stats.wxml`, `stats.wxss`, `stats.js`, `stats.json`

**Step 1: 实现统计页**

`pages/stats/stats.json`:
```json
{ "navigationBarTitleText": "练习统计" }
```

`pages/stats/stats.js`:
```js
const { getStats } = require('../../utils/storage')

Page({
  data: { stats: null },
  onShow() {
    const stats = getStats()
    const rate = stats.totalCount > 0 ? Math.round(stats.correctCount / stats.totalCount * 100) : 0
    const easyRate = stats.byDifficulty.easy.total > 0 ?
      Math.round(stats.byDifficulty.easy.correct / stats.byDifficulty.easy.total * 100) : 0
    const medRate = stats.byDifficulty.medium.total > 0 ?
      Math.round(stats.byDifficulty.medium.correct / stats.byDifficulty.medium.total * 100) : 0
    const hardRate = stats.byDifficulty.hard.total > 0 ?
      Math.round(stats.byDifficulty.hard.correct / stats.byDifficulty.hard.total * 100) : 0
    this.setData({ stats, rate, easyRate, medRate, hardRate })
  }
})
```

`pages/stats/stats.wxml`:
```xml
<view class="container">
  <view class="stat-card">
    <view class="stat-big">{{stats.totalCount}}</view>
    <view class="stat-label">总练习题数</view>
  </view>
  <view class="stat-card">
    <view class="stat-big">{{rate}}%</view>
    <view class="stat-label">总正确率</view>
  </view>
  <view class="stat-card">
    <view class="stat-big">{{stats.maxStreak}}</view>
    <view class="stat-label">最长连对</view>
  </view>

  <view class="section-title">各难度正确率</view>
  <view class="bar-item">
    <text class="bar-label">入门</text>
    <view class="bar-bg"><view class="bar-fill" style="width:{{easyRate}}%"></view></view>
    <text class="bar-pct">{{easyRate}}%</text>
  </view>
  <view class="bar-item">
    <text class="bar-label">进阶</text>
    <view class="bar-bg"><view class="bar-fill medium" style="width:{{medRate}}%"></view></view>
    <text class="bar-pct">{{medRate}}%</text>
  </view>
  <view class="bar-item">
    <text class="bar-label">高级</text>
    <view class="bar-bg"><view class="bar-fill hard" style="width:{{hardRate}}%"></view></view>
    <text class="bar-pct">{{hardRate}}%</text>
  </view>
</view>
```

`pages/stats/stats.wxss`:
```css
.container { padding: 40rpx; }
.stat-card {
  text-align: center;
  padding: 30rpx;
  background: rgba(255,255,255,0.05);
  border-radius: 12rpx;
  margin-bottom: 20rpx;
}
.stat-big { font-size: 56rpx; font-weight: bold; color: #e8c840; }
.stat-label { font-size: 24rpx; color: #a8d8a8; margin-top: 8rpx; }
.section-title {
  font-size: 28rpx; color: #f0e6d2; margin: 40rpx 0 20rpx; font-weight: bold;
}
.bar-item {
  display: flex; align-items: center; gap: 16rpx; margin-bottom: 16rpx;
}
.bar-label { font-size: 26rpx; color: #a8d8a8; width: 80rpx; }
.bar-bg {
  flex: 1; height: 24rpx; background: rgba(255,255,255,0.1); border-radius: 12rpx; overflow: hidden;
}
.bar-fill {
  height: 100%; background: #27ae60; border-radius: 12rpx; transition: width 0.3s;
}
.bar-fill.medium { background: #e8c840; }
.bar-fill.hard { background: #e74c3c; }
.bar-pct { font-size: 24rpx; color: #f0e6d2; width: 80rpx; text-align: right; }
```

**Step 2: 提交**

```bash
git add pages/stats/
git commit -m "feat: statistics page with difficulty breakdown"
```

---

## Task 12: 练习页数据绑定修复与占位结果页

**Files:**
- Modify: `pages/practice/practice.js` — 修复 tileStr 绑定
- Create: `pages/result/result.wxml`, `result.wxss`, `result.js`, `result.json`

**Step 1: 修复练习页中分析数据的 tileStr 字段**

在 `practice.js` 的 `confirmChoice` 方法中，analysis 赋值前添加 tileStr 映射：

```js
const displayAnalysis = analysis.slice(0, 5).map(a => ({
  ...a,
  tileStr: tileToString(a.tile)
}))
```

并将 `setData` 中的 `analysis: analysis.slice(0, 5)` 改为 `analysis: displayAnalysis`，增加 `userTileStr: tileToString(userTile)`, `bestTileStr: tileToString(bestTile)`。

**Step 2: 创建空的结果页占位（app.json 已注册）**

`pages/result/result.json`: `{}`
`pages/result/result.js`: `Page({})`
`pages/result/result.wxml`: `<view>预留</view>`
`pages/result/result.wxss`: (空)

**Step 3: 提交**

```bash
git add pages/practice/ pages/result/
git commit -m "fix: add tileStr display binding, add placeholder result page"
```

---

## Task 13: 端到端测试与验收

**Files:**
- Create: `core/__tests__/e2e.test.js`

**Step 1: 编写完整流程测试**

```js
const { dealHand, DIFFICULTY } = require('../dealer')
const { analyzeAllDiscards, calcRemainCount } = require('../efficiency')
const { tilesToHandArray, tileToString } = require('../tiles')
const { generateExplanation } = require('../analyzer')

function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg)
}

function runE2E() {
  console.log('=== 端到端测试 ===\n')

  for (const diff of [DIFFICULTY.EASY, DIFFICULTY.MEDIUM, DIFFICULTY.HARD]) {
    console.log(`--- ${diff} 难度 ---`)
    const result = dealHand(diff)
    assert(result !== null, `${diff} 发牌成功`)

    console.log('手牌:', result.tiles.map(tileToString).join(' '))

    const handArr = tilesToHandArray(result.tiles)
    const remain = calcRemainCount(handArr)
    const analysis = analyzeAllDiscards(handArr, remain)

    assert(analysis.length >= 1, `${diff} 有分析结果`)

    const best = analysis[0]
    console.log(`最优: 打${tileToString(best.tile)}, 向听${best.shanten}, 进张${best.totalAcceptCount}张`)

    // 模拟用户选了次优
    if (analysis.length >= 2) {
      const userChoice = analysis[1].tile
      const explanation = generateExplanation(userChoice, best.tile, analysis)
      console.log(`解析: ${explanation}`)
    }
    console.log()
  }

  console.log('=== 端到端测试通过 ===')
}

runE2E()
```

**Step 2: 运行**

Run: `node core/__tests__/e2e.test.js`
Expected: 三种难度各输出手牌、最优解、解析

**Step 3: 提交**

```bash
git add core/__tests__/e2e.test.js
git commit -m "test: end-to-end integration test for full training flow"
```

---

## 执行顺序总结

| Task | 内容 | 依赖 |
|------|------|------|
| 1 | 项目初始化 + 牌面定义 | 无 |
| 2 | 向听数计算（无财神） | Task 1 |
| 3 | 财神向听数计算 | Task 2 |
| 4 | 有效进张分析 | Task 3 |
| 5 | 发牌器 | Task 4 |
| 6 | 解析文字生成 | Task 1 |
| 7 | 本地存储 | 无 |
| 8 | 麻将牌UI组件 | Task 1 |
| 9 | 首页 | Task 7 |
| 10 | 练习页 | Task 5, 6, 7, 8 |
| 11 | 统计页 | Task 7 |
| 12 | 数据绑定修复 + 结果页占位 | Task 10 |
| 13 | 端到端测试 | Task 5, 6 |

Task 6、7、8 可与 Task 2-5 并行开发。
