# 河切训练模式 + 麻将牌视觉升级 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为杭州麻将训练器增加仿真麻将牌组件和河切（牌河读牌+攻守弃牌）训练模式。

**Architecture:** 先升级 tile 组件为仿真风格（3D牌身+传统图案），然后新增 safety.js（安全度引擎）、heqie-dealer.js（场景生成器）、heqie-analyzer.js（解析器），最后构建 heqie 页面和首页入口。所有逻辑纯前端，反向构造法生成训练场景。

**Tech Stack:** WeChat Mini Program (WXML/WXSS/JS), 无外部依赖

---

### Task 1: 麻将牌视觉升级 — 牌身3D效果 + 万字牌面

将 tile 组件从纯文字方块升级为仿真麻将牌。本任务处理牌身和万字牌(0-8)。

**Files:**
- Modify: `components/tile/tile.js`
- Modify: `components/tile/tile.wxml`
- Modify: `components/tile/tile.wxss`

**Step 1: 修改 tile.js — 增加牌面数据计算**

在 observer 中计算显示所需数据，供 WXML 使用不同的渲染模板：

```javascript
const { tileToString, isJoker, getSuit, getNumber, isNumeric } = require('../../core/tiles')

Component({
  properties: {
    tileId: { type: Number, value: -1 },
    selected: { type: Boolean, value: false },
    disabled: { type: Boolean, value: false },
    showBest: { type: Boolean, value: false },
    small: { type: Boolean, value: false },  // 牌河用小号牌
    dangerLevel: { type: Number, value: -1 }  // -1=不显示, 0=安全, 1=注意, 2=危险
  },
  data: {
    label: '',
    suitClass: '',
    suitType: '',     // 'wan'|'tong'|'tiao'|'feng'|'jian'|'joker'
    number: 0,        // 数字 1-9（数牌用）
    cnNumber: '',     // 中文数字（万字牌用）
    dots: [],         // 筒子圆点位置（筒子牌用）
    charLabel: ''     // 字牌大字
  },
  observers: {
    'tileId': function(id) {
      if (id < 0) return
      const suit = getSuit(id)
      const suitTypes = ['wan', 'tong', 'tiao', 'feng', 'jian']
      const suitType = isJoker(id) ? 'joker' : suitTypes[suit]
      const number = isNumeric(id) ? getNumber(id) : 0
      const cnNumbers = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九']

      const data = {
        label: tileToString(id),
        suitClass: suitType,
        suitType: suitType,
        number: number,
        cnNumber: suitType === 'wan' ? cnNumbers[number] : '',
        dots: suitType === 'tong' ? this._getDotPositions(number) : [],
        charLabel: ''
      }

      // 风牌/箭牌的大字
      if (suitType === 'feng') {
        const chars = ['东', '南', '西', '北']
        data.charLabel = chars[id - 27]
      } else if (suitType === 'jian') {
        const chars = ['中', '发']
        data.charLabel = chars[id - 31]
      } else if (suitType === 'joker') {
        data.charLabel = '财'
      }

      this.setData(data)
    }
  },
  methods: {
    onTap() {
      if (!this.data.disabled) {
        this.triggerEvent('select', { tileId: this.data.tileId })
      }
    },
    _getDotPositions(num) {
      // 返回筒子圆点的 CSS class 数组，用于排列
      // 每个元素是一个 row 数组，表示该行几个点
      const layouts = {
        1: [[1]],
        2: [[1],[1]],
        3: [[1],[1],[1]],
        4: [[2],[2]],
        5: [[2],[1],[2]],
        6: [[2],[2],[2]],
        7: [[2],[2],[2],[1]],
        8: [[2],[2],[2],[2]],
        9: [[3],[3],[3]]
      }
      return layouts[num] || []
    }
  }
})
```

**Step 2: 修改 tile.wxml — 条件渲染不同牌面**

```xml
<view class="tile {{suitClass}} {{selected ? 'selected' : ''}} {{disabled ? 'disabled' : ''}} {{showBest ? 'best' : ''}} {{small ? 'tile-small' : ''}}"
      bindtap="onTap">
  <!-- 危险度标记（河切模式用） -->
  <view wx:if="{{dangerLevel >= 0}}" class="danger-dot danger-{{dangerLevel}}"></view>

  <!-- 万字牌：中文数字 + 万 -->
  <block wx:if="{{suitType === 'wan'}}">
    <text class="wan-num">{{cnNumber}}</text>
    <text class="wan-char">万</text>
  </block>

  <!-- 筒子牌：圆点排列 -->
  <block wx:elif="{{suitType === 'tong'}}">
    <view class="dots-grid">
      <view class="dot-row" wx:for="{{dots}}" wx:key="index" wx:for-item="row">
        <view class="dot" wx:for="{{row}}" wx:key="idx" wx:for-item="count">
        </view>
      </view>
    </view>
  </block>

  <!-- 条子牌：数字+条 -->
  <block wx:elif="{{suitType === 'tiao'}}">
    <text class="tiao-num">{{number}}</text>
    <text class="tiao-char">条</text>
  </block>

  <!-- 风牌 -->
  <block wx:elif="{{suitType === 'feng'}}">
    <text class="feng-char">{{charLabel}}</text>
  </block>

  <!-- 箭牌 -->
  <block wx:elif="{{suitType === 'jian'}}">
    <text class="jian-char jian-{{charLabel}}">{{charLabel}}</text>
  </block>

  <!-- 财神 -->
  <block wx:elif="{{suitType === 'joker'}}">
    <text class="joker-char">{{charLabel}}</text>
    <text class="joker-sub">神</text>
  </block>
</view>
```

**Step 3: 重写 tile.wxss — 3D牌身 + 各花色样式**

```css
/* ===== 牌身：仿真3D效果 ===== */
.tile {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 72rpx;
  height: 100rpx;
  background: linear-gradient(180deg, #faf6ee 0%, #ede7d5 60%, #ddd7c4 100%);
  border: 2rpx solid #c8b88a;
  border-radius: 8rpx;
  margin: 4rpx;
  box-shadow:
    1rpx 2rpx 0 #b8a878,
    2rpx 4rpx 0 #a89868,
    3rpx 6rpx 8rpx rgba(0,0,0,0.3);
  transition: transform 0.15s, box-shadow 0.15s;
}

/* 小号牌（牌河用） */
.tile-small {
  width: 48rpx;
  height: 66rpx;
}

/* ===== 万字牌 ===== */
.wan-num {
  font-size: 36rpx;
  font-weight: 900;
  color: #1a237e;
  line-height: 1;
  font-family: 'STKaiti', 'KaiTi', serif;
}
.wan-char {
  font-size: 18rpx;
  color: #1a237e;
  line-height: 1;
  font-weight: bold;
}
.tile-small .wan-num { font-size: 24rpx; }
.tile-small .wan-char { font-size: 12rpx; }

/* ===== 筒子牌 ===== */
.dots-grid {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}
.dot-row {
  display: flex;
  gap: 4rpx;
}
.dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, #4fc3f7, #0277bd);
  border: 1rpx solid #01579b;
}
.tile-small .dot {
  width: 10rpx;
  height: 10rpx;
}
.tile-small .dots-grid { gap: 2rpx; }
.tile-small .dot-row { gap: 2rpx; }

/* ===== 条子牌 ===== */
.tiao-num {
  font-size: 34rpx;
  font-weight: 900;
  color: #2e7d32;
  line-height: 1;
}
.tiao-char {
  font-size: 16rpx;
  color: #2e7d32;
  font-weight: bold;
  line-height: 1;
}
.tile-small .tiao-num { font-size: 22rpx; }
.tile-small .tiao-char { font-size: 10rpx; }

/* ===== 风牌 ===== */
.feng-char {
  font-size: 40rpx;
  font-weight: 900;
  color: #263238;
  font-family: 'STKaiti', 'KaiTi', serif;
}
.tile-small .feng-char { font-size: 28rpx; }

/* ===== 箭牌 ===== */
.jian-char {
  font-size: 42rpx;
  font-weight: 900;
  font-family: 'STKaiti', 'KaiTi', serif;
}
.jian-中 { color: #c62828; }
.jian-发 { color: #2e7d32; }
.tile-small .jian-char { font-size: 28rpx; }

/* ===== 财神 ===== */
.joker {
  background: linear-gradient(180deg, #fff8e1 0%, #ffe082 60%, #ffc107 100%);
  border-color: #f9a825;
  box-shadow:
    1rpx 2rpx 0 #f57f17,
    2rpx 4rpx 0 #e65100,
    3rpx 6rpx 8rpx rgba(0,0,0,0.3);
}
.joker-char {
  font-size: 34rpx;
  font-weight: 900;
  color: #c62828;
  line-height: 1;
}
.joker-sub {
  font-size: 16rpx;
  color: #c62828;
  font-weight: bold;
  line-height: 1;
}
.tile-small .joker-char { font-size: 22rpx; }
.tile-small .joker-sub { font-size: 10rpx; }

/* ===== 交互状态 ===== */
.selected {
  transform: translateY(-16rpx);
  box-shadow:
    0 8rpx 16rpx rgba(0,0,0,0.4);
  border-color: #e74c3c;
}
.best {
  border-color: #27ae60;
  box-shadow: 0 0 12rpx rgba(39,174,96,0.6);
}
.disabled { opacity: 0.6; }

/* ===== 危险度标记（河切模式） ===== */
.danger-dot {
  position: absolute;
  top: 4rpx;
  right: 4rpx;
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
}
.danger-0 { background: #4caf50; } /* 安全 */
.danger-1 { background: #ff9800; } /* 注意 */
.danger-2 { background: #f44336; } /* 危险 */
```

**Step 4: 在微信开发者工具中验证**

在 WeChat DevTools 中打开何切练习页面，检查：
- 万字牌显示中文数字+万字，蓝色
- 筒子牌显示蓝色圆点排列
- 条子牌显示绿色数字+条
- 风牌显示大字
- 财神牌金色背景+财神字样
- 选中状态浮起正常
- 整体看起来像真实麻将牌

**Step 5: Commit**

```bash
git add components/tile/
git commit -m "feat: 麻将牌组件升级为仿真风格 — 3D牌身+传统图案"
```

---

### Task 2: 筒子圆点渲染修正

Task 1 的筒子渲染用了嵌套循环，WXML 的 `wx:for` 在嵌套时需要特殊处理。本任务验证并修正筒子渲染。

**Files:**
- Modify: `components/tile/tile.js` (如需调整 dots 数据结构)
- Modify: `components/tile/tile.wxml` (筒子渲染部分)

**Step 1: 修正 dots 数据结构**

`_getDotPositions` 返回的数组需要能被 `wx:for` 正确遍历。改为扁平化结构：每个 row 是 { count: N } 对象：

```javascript
_getDotPositions(num) {
  // 返回行数组，每行 {dots: N} 个圆点
  const layouts = {
    1: [{dots:1}],
    2: [{dots:1},{dots:1}],
    3: [{dots:1},{dots:1},{dots:1}],
    4: [{dots:2},{dots:2}],
    5: [{dots:2},{dots:1},{dots:2}],
    6: [{dots:2},{dots:2},{dots:2}],
    7: [{dots:2},{dots:2},{dots:2},{dots:1}],
    8: [{dots:2},{dots:2},{dots:2},{dots:2}],
    9: [{dots:3},{dots:3},{dots:3}]
  }
  return layouts[num] || []
}
```

**Step 2: 修正 WXML 筒子部分**

WeChat 的 `wx:for` 不支持在循环体内直接循环数字。用重复 `<view>` 替代：

```xml
<!-- 筒子牌：圆点排列 -->
<block wx:elif="{{suitType === 'tong'}}">
  <view class="dots-grid">
    <view class="dot-row" wx:for="{{dots}}" wx:key="index">
      <view class="dot"></view>
      <view class="dot" wx:if="{{item.dots >= 2}}"></view>
      <view class="dot" wx:if="{{item.dots >= 3}}"></view>
    </view>
  </view>
</block>
```

**Step 3: 在微信开发者工具中逐个验证 1筒~9筒**

预期：
- 1筒: 1个圆点居中
- 4筒: 2x2排列
- 5筒: 2+1+2排列
- 9筒: 3x3排列

**Step 4: Commit**

```bash
git add components/tile/
git commit -m "fix: 筒子牌圆点渲染修正"
```

---

### Task 3: 安全度评分引擎

核心算法：根据对手牌河+明牌，评估每张牌对特定对手的危险度。

**Files:**
- Create: `core/safety.js`
- Create: `core/__tests__/safety.test.js`

**Step 1: 写测试**

```javascript
const { calcDanger, calcVisibleCount, detectSuitPattern, DANGER_SAFE, DANGER_WARN, DANGER_HIGH } = require('../safety')
const { tilesToHandArray } = require('../tiles')

function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg)
}

function runTests() {
  // === 基础安全牌测试 ===

  // 对手自己打过的牌 = 安全
  const river1 = [0, 1, 27, 31] // 对手打过 1万 2万 东 中
  const melds1 = []
  const myHand = tilesToHandArray([3,4,5, 9,10,11, 18,19,20, 6,6, 28,28])
  const d1 = calcDanger(0, river1, melds1, myHand, 0, 8) // 问1万是否安全
  assert(d1 <= DANGER_SAFE, '对手打过的牌应安全, got ' + d1)

  // === 壁牌测试 ===
  // 4张都能看到 = 安全（相关顺子不存在）
  // 假设手里有2张5筒，牌河有2张5筒 → 5筒见4张 → 相关牌安全
  const myHand2 = tilesToHandArray([13,13, 0,1,2, 9,10,11, 18,19, 27,27, 28])
  const river2 = [13, 13] // 牌河2张5筒(id=13)，手里2张 → 4张全见
  // 4筒(12)和6筒(14)的顺子需要5筒，但5筒已全出 → 12和14变安全
  const d2 = calcDanger(12, river2, [], myHand2, 0, 8) // 4筒
  console.log('壁牌安全度:', d2)
  // 壁牌不是绝对安全（对手可能碰/刻），但应显著降低危险度

  // === 花色判断测试 ===
  // 对手大量弃万字 → 万字安全
  const river3 = [0, 1, 2, 3, 5, 6] // 对手打了大量万字
  const melds3 = [{type: 'pon', tiles: [13,13,13]}] // 碰了5筒
  const myHand3 = tilesToHandArray([9,10,11, 18,19,20, 27,28,29, 7,7, 30])
  const d_wan = calcDanger(4, river3, melds3, myHand3, 0, 8)  // 5万对该对手
  const d_tong = calcDanger(14, river3, melds3, myHand3, 0, 8) // 6筒对该对手
  console.log('万字危险度:', d_wan, '筒子危险度:', d_tong)
  assert(d_wan < d_tong, '对手弃万字 → 万字应比筒子安全')

  // === 承包加成测试 ===
  // 已喂2摊，危险度应显著上升
  const d_feed0 = calcDanger(14, river3, melds3, myHand3, 0, 8) // 0摊
  const d_feed2 = calcDanger(14, river3, melds3, myHand3, 2, 8) // 2摊
  console.log('0摊危险:', d_feed0, '2摊危险:', d_feed2)
  assert(d_feed2 > d_feed0, '已喂2摊应增加危险度')

  // === detectSuitPattern 测试 ===
  const pattern = detectSuitPattern(river3, melds3)
  console.log('花色推断:', pattern)
  // 对手弃了很多万字 + 碰了筒子 → 可能做筒子
  assert(pattern.safeSuits.includes(0), '万字应被判为安全花色')

  // === calcVisibleCount 测试 ===
  const visible = calcVisibleCount(myHand3, [river3], [melds3])
  assert(visible[0] >= 1, '1万至少可见1张')

  console.log('All safety tests passed!')
}

runTests()
```

**Step 2: 运行测试，确认全部失败**

```bash
node core/__tests__/safety.test.js
```

Expected: FAIL — `Cannot find module '../safety'`

**Step 3: 实现 safety.js**

```javascript
const { isNumeric, getSuit, getNumber, JOKER_ID } = require('./tiles')

const DANGER_SAFE = 30   // 0-30: 安全
const DANGER_WARN = 60   // 31-60: 注意
const DANGER_HIGH = 100  // 61-100: 危险

// 计算所有可见牌数量（手牌+所有牌河+所有明牌）
function calcVisibleCount(myHand, allRivers, allMelds) {
  const visible = new Array(34).fill(0)
  for (let i = 0; i < 34; i++) visible[i] = myHand[i]
  for (const river of allRivers) {
    for (const t of river) visible[t]++
  }
  for (const melds of allMelds) {
    for (const meld of melds) {
      for (const t of meld.tiles) visible[t]++
    }
  }
  return visible
}

// 推断对手的花色倾向
function detectSuitPattern(river, melds) {
  // 统计牌河中各花色出牌数
  const riverSuitCount = [0, 0, 0] // 万筒条
  let riverHonorCount = 0
  for (const t of river) {
    if (isNumeric(t)) {
      riverSuitCount[getSuit(t)]++
    } else {
      riverHonorCount++
    }
  }

  // 统计明牌中各花色
  const meldSuitCount = [0, 0, 0]
  for (const meld of melds) {
    for (const t of meld.tiles) {
      if (isNumeric(t)) meldSuitCount[getSuit(t)]++
    }
  }

  // 判断安全花色（对手大量弃的花色）和危险花色（对手明牌多的花色）
  const safeSuits = []
  const dangerSuits = []
  const totalRiverNumeric = riverSuitCount.reduce((a, b) => a + b, 0)

  for (let s = 0; s < 3; s++) {
    // 安全：该花色占牌河数牌的40%以上
    if (totalRiverNumeric > 0 && riverSuitCount[s] / totalRiverNumeric >= 0.4) {
      safeSuits.push(s)
    }
    // 危险：明牌中该花色 >= 3张（碰/吃了该花色）
    if (meldSuitCount[s] >= 3) {
      dangerSuits.push(s)
    }
  }

  // 如果弃了2个花色的牌但有1个花色几乎没弃 → 该花色危险
  for (let s = 0; s < 3; s++) {
    if (riverSuitCount[s] === 0 && totalRiverNumeric >= 4 && !dangerSuits.includes(s)) {
      dangerSuits.push(s)
    }
  }

  return { safeSuits, dangerSuits, riverSuitCount, meldSuitCount }
}

// 计算单张牌对单个对手的危险度 (0-100)
function calcDanger(tileId, opponentRiver, opponentMelds, myHand, myFeedCount, turnNumber) {
  // 1. 对手自己打过 → 安全（他不需要这张牌）
  if (opponentRiver.includes(tileId)) return 0

  // 2. 财神永远有价值（对手一定想要）
  if (tileId === JOKER_ID) return 95

  let danger = 50 // 基础危险度

  // 3. 位置修正：中张更危险
  if (isNumeric(tileId)) {
    const num = getNumber(tileId)
    if (num === 1 || num === 9) danger *= 0.7       // 端张
    else if (num === 2 || num === 8) danger *= 0.85  // 次端
    // 3-7保持1.0
  } else {
    // 字牌基础危险度较低
    danger *= 0.6
  }

  // 4. 花色判断
  const pattern = detectSuitPattern(opponentRiver, opponentMelds)
  if (isNumeric(tileId)) {
    const suit = getSuit(tileId)
    if (pattern.safeSuits.includes(suit)) {
      danger *= 0.3 // 对手大量弃的花色 → 安全
    }
    if (pattern.dangerSuits.includes(suit)) {
      danger *= 1.8 // 对手在做的花色 → 危险
    }
  }

  // 5. 字牌判断：对手碰过同花色字牌 → 可能在收字牌
  if (!isNumeric(tileId)) {
    for (const meld of opponentMelds) {
      if (meld.tiles[0] >= 27) danger *= 1.3 // 对手碰过字牌
    }
    // 字牌如果已出2张以上 → 对手碰不了
    // (需要visibleCount，在外层判断)
  }

  // 6. 壁牌检查（简化版：用牌河中同牌数量）
  const sameInRiver = opponentRiver.filter(t => t === tileId).length
  // 如果牌河中已有该牌（上面已判断0），这里不会到达
  // 但同类型相邻牌如果大量可见，则安全
  if (isNumeric(tileId)) {
    const num = getNumber(tileId)
    // 检查形成顺子所需的相邻牌是否大量可见
    // 简化：如果相邻2张牌在牌河中各出现2+次 → 该牌较安全
    let adjacentVisible = 0
    if (num > 1 && opponentRiver.filter(t => t === tileId - 1).length >= 2) adjacentVisible++
    if (num < 9 && opponentRiver.filter(t => t === tileId + 1).length >= 2) adjacentVisible++
    if (adjacentVisible > 0) danger *= 0.7
  }

  // 7. 承包系数：已喂2摊 → 危险度翻倍
  if (myFeedCount >= 2) {
    danger *= 2.0
  } else if (myFeedCount === 1) {
    danger *= 1.3
  }

  // 8. 巡目修正：越晚越危险
  if (turnNumber >= 12) {
    danger *= 1.3
  } else if (turnNumber >= 8) {
    danger *= 1.1
  }

  return Math.min(100, Math.max(0, Math.round(danger)))
}

// 将危险度转为等级 0=安全 1=注意 2=危险
function dangerToLevel(danger) {
  if (danger <= DANGER_SAFE) return 0
  if (danger <= DANGER_WARN) return 1
  return 2
}

// 将危险等级转为中文
function dangerLevelToText(level) {
  return ['安全', '注意', '危险'][level] || '未知'
}

module.exports = {
  calcDanger, calcVisibleCount, detectSuitPattern,
  dangerToLevel, dangerLevelToText,
  DANGER_SAFE, DANGER_WARN, DANGER_HIGH
}
```

**Step 4: 运行测试**

```bash
node core/__tests__/safety.test.js
```

Expected: All safety tests passed!

**Step 5: Commit**

```bash
git add core/safety.js core/__tests__/safety.test.js
git commit -m "feat: 安全度评分引擎 — 花色推断/壁牌/承包加成"
```

---

### Task 4: 河切场景生成器

反向构造法：先决定对手策略和听牌，再推导牌河，最后构造用户手牌。

**Files:**
- Create: `core/heqie-dealer.js`
- Create: `core/__tests__/heqie-dealer.test.js`

**Step 1: 写测试**

```javascript
const { dealHeqieScenario } = require('../heqie-dealer')
const { tilesToHandArray } = require('../tiles')

function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg)
}

function runTests() {
  // 各难度都能生成场景
  for (const diff of ['easy', 'medium', 'hard']) {
    const scenario = dealHeqieScenario(diff)
    assert(scenario !== null, `${diff} 场景生成成功`)
    assert(scenario.myHand.length === 14, `${diff} 手牌14张`)
    assert(scenario.rivers.length >= 1, `${diff} 至少1家牌河`)
    assert(scenario.questionType === 'discard' || scenario.questionType === 'safety',
      `${diff} 题型合法: ${scenario.questionType}`)

    // 牌河合理性：牌河中的牌不能重复超过4张
    const allTiles = [...scenario.myHand]
    for (const river of scenario.rivers) {
      allTiles.push(...river)
    }
    for (const melds of scenario.openMelds) {
      for (const meld of melds) {
        allTiles.push(...meld.tiles)
      }
    }
    const counts = new Array(34).fill(0)
    for (const t of allTiles) counts[t]++
    for (let i = 0; i < 34; i++) {
      assert(counts[i] <= 4, `${diff} 牌数不超4: tile ${i} has ${counts[i]}`)
    }

    console.log(`${diff}: type=${scenario.questionType}, rivers=${scenario.rivers.length}, hand=${scenario.myHand.length}`)
  }

  // 稳定性：连续生成20个场景
  let ok = 0
  for (let i = 0; i < 20; i++) {
    const diffs = ['easy', 'medium', 'hard']
    const s = dealHeqieScenario(diffs[i % 3])
    if (s && s.myHand.length === 14) ok++
  }
  console.log(`稳定性: ${ok}/20`)
  assert(ok >= 18, '至少90%成功率')

  console.log('All heqie-dealer tests passed!')
}

runTests()
```

**Step 2: 运行测试，确认失败**

```bash
node core/__tests__/heqie-dealer.test.js
```

**Step 3: 实现 heqie-dealer.js**

```javascript
const { createWall, shuffle, tilesToHandArray, JOKER_ID, isNumeric, getSuit, getNumber, tileToString } = require('./tiles')
const { calcShantenWithJoker } = require('./shanten')
const { analyzeAllDiscards, calcRemainCount } = require('./efficiency')
const { calcDanger, detectSuitPattern } = require('./safety')

// 训练概念定义
const CONCEPTS = {
  discard: [
    'suit_avoid',      // 花色回避（对手做清一色）
    'chengbao_trap',   // 承包陷阱（已喂2摊）
    'balance',         // 攻守平衡
  ],
  safety: [
    'played_safe',     // 已出牌=安全
    'suit_read',       // 花色推断
    'kabe',            // 壁牌
    'chengbao_warn',   // 承包预警
  ]
}

// 难度配置
const DIFF_CONFIG = {
  easy:   { riverCount: 1, turnRange: [6, 8],  types: ['safety'] },
  medium: { riverCount: 2, turnRange: [8, 12], types: ['safety', 'discard'] },
  hard:   { riverCount: 3, turnRange: [10, 15], types: ['discard', 'safety'] }
}

// 生成河切练习场景
function dealHeqieScenario(difficulty, maxAttempts = 200) {
  const config = DIFF_CONFIG[difficulty]
  if (!config) return null

  // 随机选题型
  const questionType = config.types[Math.floor(Math.random() * config.types.length)]
  const turnNumber = config.turnRange[0] + Math.floor(Math.random() * (config.turnRange[1] - config.turnRange[0] + 1))

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const scenario = _buildScenario(config, questionType, turnNumber)
    if (scenario) return scenario
  }

  return null
}

function _buildScenario(config, questionType, turnNumber) {
  // 1. 洗牌，分配牌
  const wall = shuffle(createWall())
  let pos = 0

  // 我的手牌: 14张
  const myHand = wall.slice(pos, pos + 14).sort((a, b) => a - b)
  pos += 14

  // 对手手牌（每人13张，用于构造牌河）
  const opponents = []
  for (let i = 0; i < config.riverCount; i++) {
    const hand = wall.slice(pos, pos + 13)
    pos += 13
    opponents.push({ hand, river: [], melds: [] })
  }

  // 2. 为每个对手生成牌河（从剩余牌中抽取作为"摸到后打出的牌"）
  for (const opp of opponents) {
    // 模拟对手打牌：先打孤张/不需要的牌
    const riverSize = Math.min(turnNumber, Math.floor((wall.length - pos) / config.riverCount))
    const drawnTiles = wall.slice(pos, pos + riverSize)
    pos += riverSize

    // 合并对手的牌，选出要打的
    const allTiles = [...opp.hand, ...drawnTiles]
    const sorted = _sortByDiscardPriority(allTiles)
    opp.river = sorted.slice(0, Math.min(turnNumber, sorted.length))

    // 随机决定是否有明牌（碰）
    if (Math.random() < 0.4 && opp.hand.length > 3) {
      const meld = _tryMakeMeld(opp.hand)
      if (meld) opp.melds.push(meld)
    }
  }

  // 3. 构造场景数据
  const rivers = opponents.map(o => o.river)
  const openMelds = opponents.map(o => o.melds)
  const myFeeds = opponents.map(() => Math.random() < 0.15 ? 2 : (Math.random() < 0.3 ? 1 : 0))

  // 4. 验证场景合法性（牌数不超限）
  if (!_validateTileCounts(myHand, rivers, openMelds)) return null

  // 5. 根据题型生成答案
  if (questionType === 'safety') {
    return _buildSafetyQuestion(myHand, rivers, openMelds, myFeeds, turnNumber)
  } else {
    return _buildDiscardQuestion(myHand, rivers, openMelds, myFeeds, turnNumber)
  }
}

// 按弃牌优先级排序：字牌 > 端张 > 中张
function _sortByDiscardPriority(tiles) {
  return [...tiles].sort((a, b) => {
    const pa = _discardPriority(a)
    const pb = _discardPriority(b)
    if (pa !== pb) return pb - pa // 高优先级先打
    return Math.random() - 0.5   // 同优先级随机
  })
}

function _discardPriority(tileId) {
  if (tileId === JOKER_ID) return 0 // 财神不会打
  if (!isNumeric(tileId)) return 90 + Math.random() * 10 // 字牌优先打
  const num = getNumber(tileId)
  if (num === 1 || num === 9) return 70 + Math.random() * 10
  if (num === 2 || num === 8) return 50 + Math.random() * 10
  return 20 + Math.random() * 10 // 中张最后打
}

function _tryMakeMeld(hand) {
  // 从手牌中找可碰的牌
  const counts = new Array(34).fill(0)
  for (const t of hand) counts[t]++
  for (let i = 0; i < 34; i++) {
    if (i === JOKER_ID) continue
    if (counts[i] >= 3) {
      return { type: 'pon', tiles: [i, i, i] }
    }
  }
  return null
}

function _validateTileCounts(myHand, rivers, openMelds) {
  const counts = new Array(34).fill(0)
  for (const t of myHand) counts[t]++
  for (const r of rivers) for (const t of r) counts[t]++
  for (const melds of openMelds) {
    for (const meld of melds) {
      for (const t of meld.tiles) counts[t]++
    }
  }
  for (let i = 0; i < 34; i++) {
    if (counts[i] > 4) return false
  }
  return true
}

function _buildSafetyQuestion(myHand, rivers, openMelds, myFeeds, turnNumber) {
  // 从手牌中随机选一张作为"要问的牌"
  const handArr = tilesToHandArray(myHand)
  const candidates = []
  const seen = new Set()
  for (const t of myHand) {
    if (seen.has(t)) continue
    seen.add(t)
    // 计算这张牌对第一个对手的危险度
    const danger = calcDanger(t, rivers[0], openMelds[0], handArr, myFeeds[0], turnNumber)
    candidates.push({ tile: t, danger })
  }

  if (candidates.length < 2) return null

  // 选一张有明确安全/危险判断的牌
  candidates.sort((a, b) => Math.abs(b.danger - 50) - Math.abs(a.danger - 50))
  const targetTile = candidates[0].tile
  const correctDanger = candidates[0].danger

  return {
    myHand,
    rivers,
    openMelds,
    myFeeds,
    turnNumber,
    questionType: 'safety',
    targetTile,
    correctDanger,
    correctLevel: correctDanger <= 30 ? 0 : (correctDanger <= 60 ? 1 : 2)
  }
}

function _buildDiscardQuestion(myHand, rivers, openMelds, myFeeds, turnNumber) {
  const handArr = tilesToHandArray(myHand)
  const remain = calcRemainCount(handArr)
  // 把牌河和明牌中的牌也从remain中减去
  for (const r of rivers) for (const t of r) remain[t] = Math.max(0, remain[t] - 1)
  for (const melds of openMelds) {
    for (const meld of melds) {
      for (const t of meld.tiles) remain[t] = Math.max(0, remain[t] - 1)
    }
  }

  const effAnalysis = analyzeAllDiscards(handArr, remain)

  // 计算每张牌的综合得分（牌效-危险度）
  const scored = effAnalysis.map(a => {
    let maxDanger = 0
    for (let oi = 0; oi < rivers.length; oi++) {
      const d = calcDanger(a.tile, rivers[oi], openMelds[oi], handArr, myFeeds[oi], turnNumber)
      maxDanger = Math.max(maxDanger, d)
    }
    // 牌效分：进张数归一化到0-100
    const offenseScore = Math.min(100, a.totalAcceptCount * 2)
    // 综合分 = 牌效 - 危险度 * 权重
    const defWeight = myFeeds.some(f => f >= 2) ? 1.5 : 0.8
    const score = offenseScore - maxDanger * defWeight
    return { ...a, maxDanger, offenseScore, score }
  })

  scored.sort((a, b) => {
    // 先按综合分排序
    if (Math.abs(a.score - b.score) > 5) return b.score - a.score
    // 分数接近按牌效排
    return b.totalAcceptCount - a.totalAcceptCount
  })

  // 检查训练价值
  if (scored.length < 2) return null
  const best = scored[0]
  const second = scored[1]
  if (Math.abs(best.score - second.score) < 3) return null

  return {
    myHand,
    rivers,
    openMelds,
    myFeeds,
    turnNumber,
    questionType: 'discard',
    analysis: scored,
    bestTile: best.tile
  }
}

module.exports = { dealHeqieScenario }
```

**Step 4: 运行测试**

```bash
node core/__tests__/heqie-dealer.test.js
```

Expected: All heqie-dealer tests passed!

**Step 5: Commit**

```bash
git add core/heqie-dealer.js core/__tests__/heqie-dealer.test.js
git commit -m "feat: 河切场景生成器 — 反向构造法+质量验证"
```

---

### Task 5: 河切解析器

为攻守弃牌和安全判断题型生成大白话解析。

**Files:**
- Create: `core/heqie-analyzer.js`
- Create: `core/__tests__/heqie-analyzer.test.js`

**Step 1: 写测试**

```javascript
const { explainSafety, explainDiscard } = require('../heqie-analyzer')
const { tilesToHandArray } = require('../tiles')

function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg)
}

function runTests() {
  // 安全判断解析
  const myHand = tilesToHandArray([3,4,5, 9,10,11, 18,19,20, 6,6, 28,28])
  const river = [0, 1, 2, 3, 5, 6] // 大量万字
  const melds = [{type: 'pon', tiles: [13,13,13]}]

  const safeExplain = explainSafety(4, river, melds, myHand, 0, 8) // 5万
  console.log('安全解析(5万):', safeExplain)
  assert(safeExplain.length > 10, '安全解析有内容')
  assert(safeExplain.includes('万'), '提到花色')

  const dangerExplain = explainSafety(14, river, melds, myHand, 2, 8) // 6筒+2摊
  console.log('危险解析(6筒):', dangerExplain)
  assert(dangerExplain.length > 10, '危险解析有内容')

  // 弃牌解析
  const discardExplain = explainDiscard(14, 4, 8, 80, 12, 20) // 打6筒(危险)vs打5万(安全)
  console.log('弃牌解析:', discardExplain)
  assert(discardExplain.length > 10, '弃牌解析有内容')

  console.log('All heqie-analyzer tests passed!')
}

runTests()
```

**Step 2: 运行测试，确认失败**

```bash
node core/__tests__/heqie-analyzer.test.js
```

**Step 3: 实现 heqie-analyzer.js**

```javascript
const { tileToString, isNumeric, getSuit, getNumber, JOKER_ID } = require('./tiles')
const { calcDanger, detectSuitPattern, dangerToLevel, dangerLevelToText } = require('./safety')

const SUIT_NAMES = ['万字', '筒子', '条子']

// 安全判断题的解析
function explainSafety(tileId, river, melds, myHand, feedCount, turnNumber) {
  const danger = calcDanger(tileId, river, melds, myHand, feedCount, turnNumber)
  const level = dangerToLevel(danger)
  const name = tileToString(tileId)
  const parts = []

  if (river.includes(tileId)) {
    parts.push(`${name}是安全的。对手自己打过这张牌，说明他不需要它。`)
    return parts.join('')
  }

  if (tileId === JOKER_ID) {
    parts.push(`${name}（财神）非常危险！财神是万能牌，任何对手都需要它。`)
    return parts.join('')
  }

  // 花色分析
  const pattern = detectSuitPattern(river, melds)

  if (isNumeric(tileId)) {
    const suit = getSuit(tileId)
    const suitName = SUIT_NAMES[suit]

    if (pattern.safeSuits.includes(suit)) {
      parts.push(`${name}比较安全。`)
      parts.push(`对手牌河里打了很多${suitName}，说明他不太需要${suitName}。`)
    } else if (pattern.dangerSuits.includes(suit)) {
      parts.push(`${name}比较危险！`)
      const reasons = []
      // 牌河中该花色少
      if (pattern.riverSuitCount[suit] === 0) {
        reasons.push(`对手牌河里没有打过${suitName}，他可能在收集${suitName}`)
      }
      // 明牌中该花色多
      if (pattern.meldSuitCount[suit] >= 3) {
        reasons.push(`对手已经碰/吃了${suitName}`)
      }
      if (reasons.length > 0) parts.push(reasons.join('，而且') + '。')

      const num = getNumber(tileId)
      if (num >= 3 && num <= 7) {
        parts.push(`${name}是中张牌，能和很多牌搭配，被吃碰的概率更高。`)
      }
    } else {
      parts.push(`${name}的安全程度一般。`)
      parts.push(`从牌河来看，暂时无法确定对手对${suitName}的需求。`)
    }
  } else {
    // 字牌分析
    const sameInRiver = river.filter(t => t === tileId).length
    if (sameInRiver > 0) {
      parts.push(`${name}比较安全，牌河里已经出过${sameInRiver}张。`)
    } else {
      const honorMelds = melds.filter(m => m.tiles[0] >= 27)
      if (honorMelds.length > 0) {
        parts.push(`${name}有一定风险。对手已经碰了字牌，可能还需要其他字牌凑刻子。`)
      } else {
        parts.push(`${name}安全程度一般。字牌通常比数牌安全些，但要注意对手是否在收集。`)
      }
    }
  }

  // 承包预警
  if (feedCount >= 2) {
    parts.push(`\n⚠️ 特别注意：你已经喂了这个对手${feedCount}摊，再喂一次就三摊承包了！${dangerLevelToText(level) === '危险' ? '这张牌千万不能打！' : '要格外小心。'}`)
  }

  return parts.join('')
}

// 弃牌题的综合解析
function explainDiscard(userTile, bestTile, userDanger, bestDanger, userAccept, bestAccept) {
  const userName = tileToString(userTile)
  const bestName = tileToString(bestTile)
  const parts = []

  if (userTile === bestTile) {
    parts.push('选对了！')
    if (bestDanger > 60) {
      parts.push(`虽然${bestName}有一定风险，但它的牌效太差了，不值得留。`)
    } else if (bestAccept > 0) {
      parts.push(`${bestName}打出后安全，而且不影响手牌结构。`)
    }
    return parts.join('')
  }

  // 用户选错了
  if (userDanger > bestDanger + 20) {
    parts.push(`打${userName}太危险了！危险度远高于打${bestName}。`)
  } else if (userAccept < bestAccept - 5) {
    parts.push(`打${userName}虽然安全，但牌效比打${bestName}差太多（少接${bestAccept - userAccept}张有用牌）。`)
  } else {
    parts.push(`打${bestName}比打${userName}更好。`)
  }

  if (bestDanger <= 30 && bestAccept > userAccept) {
    parts.push(`${bestName}既安全又不影响牌效，是攻守兼顾的最佳选择。`)
  } else if (bestDanger <= 30) {
    parts.push(`${bestName}很安全，在不影响进度的前提下优先选安全的牌。`)
  } else if (bestAccept > userAccept + 10) {
    parts.push(`虽然${bestName}有一些风险，但牌效优势太大，值得赌一下。`)
  }

  return parts.join('')
}

// 格式化安全判断结果
function formatSafetyResult(danger) {
  const level = dangerToLevel(danger)
  const labels = ['安全 🟢', '注意 🟡', '危险 🔴']
  return { level, label: labels[level], danger }
}

module.exports = { explainSafety, explainDiscard, formatSafetyResult }
```

**Step 4: 运行测试**

```bash
node core/__tests__/heqie-analyzer.test.js
```

Expected: All heqie-analyzer tests passed!

**Step 5: Commit**

```bash
git add core/heqie-analyzer.js core/__tests__/heqie-analyzer.test.js
git commit -m "feat: 河切解析器 — 安全判断+弃牌解析大白话"
```

---

### Task 6: 统计存储扩展

为河切练习增加独立的统计追踪。

**Files:**
- Modify: `utils/storage.js`

**Step 1: 扩展 storage.js**

在 `createDefaultStats` 中增加 `heqie` 分类，并增加 `recordHeqieResult` 函数：

```javascript
const STORAGE_KEY = 'majiang_trainer_stats'

function getStats() {
  try {
    const data = wx.getStorageSync(STORAGE_KEY)
    if (!data) return createDefaultStats()
    // 兼容旧版本：如果没有 heqie 字段则补上
    if (!data.heqie) {
      data.heqie = createDefaultHeqieStats()
    }
    return data
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

function createDefaultHeqieStats() {
  return {
    totalCount: 0,
    correctCount: 0,
    byDifficulty: {
      easy: { total: 0, correct: 0 },
      medium: { total: 0, correct: 0 },
      hard: { total: 0, correct: 0 }
    },
    byType: {
      discard: { total: 0, correct: 0 },
      safety: { total: 0, correct: 0 }
    }
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
    },
    heqie: createDefaultHeqieStats()
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

function recordHeqieResult(stats, difficulty, questionType, isCorrect) {
  if (!stats.heqie) stats.heqie = createDefaultHeqieStats()
  stats.heqie.totalCount++
  stats.heqie.byDifficulty[difficulty].total++
  stats.heqie.byType[questionType].total++
  if (isCorrect) {
    stats.heqie.correctCount++
    stats.heqie.byDifficulty[difficulty].correct++
    stats.heqie.byType[questionType].correct++
  }
  saveStats(stats)
  return stats
}

module.exports = { getStats, saveStats, recordResult, recordHeqieResult, createDefaultStats }
```

**Step 2: Commit**

```bash
git add utils/storage.js
git commit -m "feat: 统计存储扩展 — 增加河切练习统计"
```

---

### Task 7: 河切练习页面 — 安全判断模式

构建河切页面，先实现安全判断题型的完整UI。

**Files:**
- Create: `pages/heqie/heqie.js`
- Create: `pages/heqie/heqie.wxml`
- Create: `pages/heqie/heqie.wxss`
- Create: `pages/heqie/heqie.json`

**Step 1: 创建 heqie.json**

```json
{
  "usingComponents": {
    "tile": "/components/tile/tile"
  }
}
```

**Step 2: 创建 heqie.js**

```javascript
const { dealHeqieScenario } = require('../../core/heqie-dealer')
const { tileToString } = require('../../core/tiles')
const { explainSafety, explainDiscard, formatSafetyResult } = require('../../core/heqie-analyzer')
const { calcDanger, dangerToLevel } = require('../../core/safety')
const { tilesToHandArray } = require('../../core/tiles')
const { getStats, recordHeqieResult } = require('../../utils/storage')
const { formatAnalysisItem, shantenToText } = require('../../core/analyzer')

Page({
  data: {
    difficulty: 'easy',
    diffLabel: '入门',
    questionNum: 1,
    // 场景数据
    myHand: [],
    rivers: [],       // [[tileId, ...], ...]
    openMelds: [],     // [[{type, tiles}, ...], ...]
    myFeeds: [],
    turnNumber: 0,
    // 题型
    questionType: '',  // 'safety' | 'discard'
    // 安全判断题
    targetTile: -1,
    targetTileStr: '',
    // 弃牌题
    selectedTile: -1,
    // 答题状态
    confirmed: false,
    userAnswer: -1,    // 安全题: 0/1/2, 弃牌题: tileId
    isCorrect: false,
    explanation: '',
    correctLabel: '',
    // 牌河标签
    riverLabels: ['下家', '对家', '上家'],
    // 弃牌对比
    analysis: [],
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
      bestTileStr: ''
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
    const top5 = s.analysis.slice(0, 5).map(a => ({
      ...formatAnalysisItem(a),
      dangerLabel: a.maxDanger <= 30 ? '安全' : (a.maxDanger <= 60 ? '注意' : '危险'),
      dangerClass: a.maxDanger <= 30 ? 'safe' : (a.maxDanger <= 60 ? 'warn' : 'high'),
      barWidth: Math.round(a.totalAcceptCount / Math.max(s.analysis[0].totalAcceptCount, 1) * 100)
    }))

    const stats = getStats()
    recordHeqieResult(stats, this.data.difficulty, 'discard', isCorrect)

    this.setData({
      confirmed: true,
      userAnswer: userTile,
      isCorrect,
      explanation,
      analysis: top5,
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
```

**Step 3: 创建 heqie.wxml**

```xml
<view class="container">
  <view class="header">
    <text class="q-num">第 {{questionNum}} 题</text>
    <text class="type-tag">{{questionType === 'safety' ? '安全判断' : '攻守弃牌'}}</text>
    <text class="diff-tag">{{diffLabel}}</text>
  </view>

  <!-- 牌河展示区 -->
  <view class="rivers-area">
    <view class="river-section" wx:for="{{rivers}}" wx:key="index" wx:if="{{item.length > 0}}">
      <view class="river-header">
        <text class="river-label">{{riverLabels[index]}}</text>
        <text class="feed-warn" wx:if="{{myFeeds[index] >= 2}}">⚠️ 已喂{{myFeeds[index]}}摊</text>
        <text class="feed-info" wx:elif="{{myFeeds[index] === 1}}">已喂1摊</text>
      </view>
      <view class="river-tiles">
        <tile wx:for="{{item}}" wx:key="idx" wx:for-item="tid"
              tileId="{{tid}}" small="{{true}}" disabled="{{true}}" />
      </view>
      <!-- 明牌 -->
      <view class="melds" wx:if="{{openMelds[index].length > 0}}">
        <view class="meld" wx:for="{{openMelds[index]}}" wx:key="mi" wx:for-item="meld">
          <text class="meld-type">{{meld.type === 'pon' ? '碰' : '吃'}}</text>
          <tile wx:for="{{meld.tiles}}" wx:key="ti" wx:for-item="mt"
                tileId="{{mt}}" small="{{true}}" disabled="{{true}}" />
        </view>
      </view>
    </view>
  </view>

  <!-- 安全判断题 -->
  <block wx:if="{{questionType === 'safety'}}">
    <view class="safety-question" wx:if="{{!confirmed}}">
      <text class="safety-prompt">这张牌打出去安全吗？</text>
      <view class="target-tile-wrap">
        <tile tileId="{{targetTile}}" disabled="{{true}}" />
      </view>
      <view class="safety-choices">
        <view class="safety-btn safe" data-level="0" bindtap="onSafetyChoice">安全 🟢</view>
        <view class="safety-btn warn" data-level="1" bindtap="onSafetyChoice">注意 🟡</view>
        <view class="safety-btn danger" data-level="2" bindtap="onSafetyChoice">危险 🔴</view>
      </view>
    </view>
  </block>

  <!-- 弃牌题 -->
  <block wx:if="{{questionType === 'discard'}}">
    <view class="prompt" wx:if="{{!confirmed}}">综合牌效和安全性，选一张打出</view>
    <view class="hand">
      <tile wx:for="{{myHand}}" wx:key="index"
            tileId="{{item}}"
            selected="{{selectedTile === item && !confirmed}}"
            showBest="{{confirmed && item === _scenario.bestTile}}"
            disabled="{{confirmed}}"
            bind:select="onTileSelect" />
    </view>
  </block>

  <!-- 答题结果 -->
  <block wx:if="{{confirmed}}">
    <view class="result {{isCorrect ? 'correct' : 'wrong'}}">
      <text class="result-text">{{isCorrect ? '判断正确！' : '不太对'}}</text>
    </view>

    <!-- 安全判断题的正确答案 -->
    <view class="correct-answer" wx:if="{{questionType === 'safety'}}">
      <text>正确答案：{{correctLabel}}</text>
    </view>

    <!-- 弃牌题的正确答案 -->
    <view class="correct-answer" wx:if="{{questionType === 'discard' && !isCorrect}}">
      <text>更好的选择：打 {{bestTileStr}}</text>
    </view>

    <!-- 解析 -->
    <view class="explanation">
      <view class="exp-header"><text class="exp-label">为什么？</text></view>
      <text class="exp-text">{{explanation}}</text>
    </view>

    <!-- 弃牌对比（仅弃牌题） -->
    <view class="analysis-list" wx:if="{{questionType === 'discard' && analysis.length > 0}}">
      <view class="analysis-header">
        <text class="analysis-title">各选择对比</text>
      </view>
      <view class="analysis-item {{item.tile === _scenario.bestTile ? 'best-item' : ''}}"
            wx:for="{{analysis}}" wx:key="tile">
        <view class="a-left">
          <text class="a-tile">打{{item.tileStr}}</text>
          <text class="a-steps">{{item.shantenText}}</text>
        </view>
        <view class="a-bar-wrap">
          <view class="a-bar" style="width: {{item.barWidth}}%"></view>
        </view>
        <text class="a-count">{{item.totalAcceptCount}}张</text>
        <text class="a-danger {{item.dangerClass}}">{{item.dangerLabel}}</text>
      </view>
    </view>

    <view class="actions">
      <view class="next-btn" bindtap="nextQuestion">下一题</view>
      <view class="back-btn" bindtap="goBack">返回首页</view>
    </view>
  </block>
</view>
```

**Step 4: 创建 heqie.wxss**

```css
.container { padding: 20rpx; }
.header { display: flex; align-items: center; gap: 16rpx; margin-bottom: 20rpx; }
.q-num { font-size: 32rpx; color: #f0e6d2; }
.type-tag { font-size: 22rpx; padding: 4rpx 12rpx; background: rgba(232,200,64,0.2); color: #e8c840; border-radius: 6rpx; }
.diff-tag { font-size: 22rpx; padding: 4rpx 12rpx; background: rgba(168,216,168,0.2); color: #a8d8a8; border-radius: 6rpx; }

/* 牌河区域 */
.rivers-area { margin-bottom: 24rpx; }
.river-section { background: rgba(255,255,255,0.05); border-radius: 12rpx; padding: 16rpx; margin-bottom: 12rpx; }
.river-header { display: flex; align-items: center; gap: 12rpx; margin-bottom: 8rpx; }
.river-label { font-size: 24rpx; color: #a8d8a8; font-weight: bold; }
.feed-warn { font-size: 22rpx; color: #f44336; font-weight: bold; }
.feed-info { font-size: 22rpx; color: #ff9800; }
.river-tiles { display: flex; flex-wrap: wrap; }
.melds { display: flex; gap: 16rpx; margin-top: 8rpx; padding-top: 8rpx; border-top: 1rpx solid rgba(255,255,255,0.1); }
.meld { display: flex; align-items: center; gap: 4rpx; }
.meld-type { font-size: 20rpx; color: #ff9800; margin-right: 4rpx; }

/* 安全判断题 */
.safety-question { text-align: center; }
.safety-prompt { font-size: 30rpx; color: #f0e6d2; display: block; margin-bottom: 24rpx; }
.target-tile-wrap { display: flex; justify-content: center; margin-bottom: 30rpx; }
.safety-choices { display: flex; justify-content: center; gap: 24rpx; }
.safety-btn { padding: 20rpx 32rpx; border-radius: 12rpx; font-size: 28rpx; font-weight: bold; }
.safety-btn.safe { background: rgba(76,175,80,0.2); color: #4caf50; border: 2rpx solid #4caf50; }
.safety-btn.warn { background: rgba(255,152,0,0.2); color: #ff9800; border: 2rpx solid #ff9800; }
.safety-btn.danger { background: rgba(244,67,54,0.2); color: #f44336; border: 2rpx solid #f44336; }

/* 弃牌题 */
.prompt { text-align: center; font-size: 26rpx; color: #a8d8a8; margin-bottom: 16rpx; }
.hand { display: flex; flex-wrap: wrap; justify-content: center; padding: 10rpx 0 20rpx; }

/* 结果 */
.result { display: flex; align-items: center; justify-content: center; padding: 24rpx; border-radius: 12rpx; margin-bottom: 16rpx; }
.result.correct { background: rgba(39,174,96,0.2); }
.result.wrong { background: rgba(231,76,60,0.2); }
.result-text { font-size: 34rpx; font-weight: bold; }
.result.correct .result-text { color: #27ae60; }
.result.wrong .result-text { color: #e74c3c; }

.correct-answer { text-align: center; font-size: 28rpx; color: #f0e6d2; margin-bottom: 16rpx; padding: 12rpx; background: rgba(255,255,255,0.05); border-radius: 8rpx; }

/* 解析 */
.explanation { background: rgba(232,200,64,0.12); border-radius: 12rpx; padding: 24rpx; margin-bottom: 20rpx; border-left: 6rpx solid #e8c840; }
.exp-header { margin-bottom: 12rpx; }
.exp-label { font-size: 28rpx; color: #e8c840; font-weight: bold; }
.exp-text { font-size: 28rpx; line-height: 1.8; color: #f0e6d2; }

/* 弃牌对比（复用何切样式） */
.analysis-list { background: rgba(255,255,255,0.05); border-radius: 12rpx; padding: 20rpx; margin-bottom: 30rpx; }
.analysis-header { margin-bottom: 16rpx; }
.analysis-title { font-size: 26rpx; color: #a8d8a8; font-weight: bold; }
.analysis-item { display: flex; align-items: center; padding: 10rpx 12rpx; border-radius: 8rpx; margin-bottom: 8rpx; gap: 10rpx; }
.a-left { display: flex; flex-direction: column; width: 90rpx; flex-shrink: 0; }
.a-tile { font-size: 24rpx; font-weight: bold; color: #f0e6d2; }
.a-steps { font-size: 20rpx; color: #a8d8a8; }
.a-bar-wrap { flex: 1; height: 20rpx; background: rgba(255,255,255,0.08); border-radius: 10rpx; overflow: hidden; }
.a-bar { height: 100%; background: #5a9a6a; border-radius: 10rpx; min-width: 4rpx; }
.a-count { font-size: 22rpx; color: #c0c0c0; width: 60rpx; text-align: right; flex-shrink: 0; }
.a-danger { font-size: 20rpx; width: 60rpx; text-align: center; border-radius: 4rpx; padding: 2rpx 0; }
.a-danger.safe { color: #4caf50; }
.a-danger.warn { color: #ff9800; }
.a-danger.high { color: #f44336; }
.best-item { background: rgba(39,174,96,0.12); }
.best-item .a-tile { color: #27ae60; }
.best-item .a-bar { background: #27ae60; }

/* 操作按钮 */
.actions { display: flex; justify-content: center; gap: 30rpx; padding-bottom: 40rpx; }
.next-btn { padding: 16rpx 60rpx; background: #e8c840; color: #2c1810; font-size: 30rpx; font-weight: bold; border-radius: 40rpx; }
.back-btn { padding: 16rpx 40rpx; border: 2rpx solid #a8d8a8; color: #a8d8a8; font-size: 30rpx; border-radius: 40rpx; }
```

**Step 5: Commit**

```bash
git add pages/heqie/
git commit -m "feat: 河切练习页面 — 安全判断+攻守弃牌UI"
```

---

### Task 8: 首页改造 + 路由注册

在首页增加河切练习入口，注册新页面路由。

**Files:**
- Modify: `pages/index/index.wxml`
- Modify: `pages/index/index.wxss`
- Modify: `pages/index/index.js`
- Modify: `app.json`

**Step 1: 修改 app.json — 注册河切页面**

在 pages 数组中加入 `"pages/heqie/heqie"`：

```json
{
  "pages": [
    "pages/index/index",
    "pages/practice/practice",
    "pages/heqie/heqie",
    "pages/result/result",
    "pages/stats/stats"
  ],
  "window": {
    "backgroundTextStyle": "dark",
    "navigationBarBackgroundColor": "#1a6b3c",
    "navigationBarTitleText": "杭州麻将训练器",
    "navigationBarTextStyle": "white"
  }
}
```

**Step 2: 修改 index.js — 增加河切相关方法**

```javascript
const { getStats } = require('../../utils/storage')

Page({
  data: {
    difficulty: 'easy',
    heqieDifficulty: 'easy',
    stats: null,
    correctRate: 0,
    heqieStats: null,
    heqieCorrectRate: 0
  },
  onShow() {
    const stats = getStats()
    const correctRate = stats.totalCount > 0 ? Math.round(stats.correctCount / stats.totalCount * 100) : 0
    const heqie = stats.heqie || {}
    const heqieCorrectRate = heqie.totalCount > 0 ? Math.round(heqie.correctCount / heqie.totalCount * 100) : 0
    this.setData({ stats, correctRate, heqieStats: heqie, heqieCorrectRate })
  },
  selectDifficulty(e) {
    this.setData({ difficulty: e.currentTarget.dataset.level })
  },
  selectHeqieDifficulty(e) {
    this.setData({ heqieDifficulty: e.currentTarget.dataset.level })
  },
  startPractice() {
    wx.navigateTo({
      url: '/pages/practice/practice?difficulty=' + this.data.difficulty
    })
  },
  startHeqie() {
    wx.navigateTo({
      url: '/pages/heqie/heqie?difficulty=' + this.data.heqieDifficulty
    })
  },
  goStats() {
    wx.navigateTo({ url: '/pages/stats/stats' })
  }
})
```

**Step 3: 修改 index.wxml — 增加河切入口**

```xml
<view class="container">
  <view class="title">杭州麻将</view>
  <view class="subtitle">训练器</view>

  <!-- 何切练习 -->
  <view class="mode-section">
    <view class="mode-header">
      <text class="mode-icon">🎯</text>
      <view class="mode-info">
        <text class="mode-title">何切练习</text>
        <text class="mode-desc">选最优弃牌，练牌效</text>
      </view>
    </view>
    <view class="diff-buttons">
      <view class="diff-btn {{difficulty === 'easy' ? 'active' : ''}}"
            data-level="easy" bindtap="selectDifficulty">入门</view>
      <view class="diff-btn {{difficulty === 'medium' ? 'active' : ''}}"
            data-level="medium" bindtap="selectDifficulty">进阶</view>
      <view class="diff-btn {{difficulty === 'hard' ? 'active' : ''}}"
            data-level="hard" bindtap="selectDifficulty">高级</view>
    </view>
    <view class="start-btn" bindtap="startPractice">开始练习</view>
    <view class="mode-stats" wx:if="{{stats && stats.totalCount > 0}}">
      <text>已练{{stats.totalCount}}题 · 正确率{{correctRate}}%</text>
    </view>
  </view>

  <!-- 河切练习 -->
  <view class="mode-section heqie-section">
    <view class="mode-header">
      <text class="mode-icon">🛡️</text>
      <view class="mode-info">
        <text class="mode-title">河切练习</text>
        <text class="mode-desc">读牌河，练攻守</text>
      </view>
    </view>
    <view class="diff-buttons">
      <view class="diff-btn {{heqieDifficulty === 'easy' ? 'active' : ''}}"
            data-level="easy" bindtap="selectHeqieDifficulty">入门</view>
      <view class="diff-btn {{heqieDifficulty === 'medium' ? 'active' : ''}}"
            data-level="medium" bindtap="selectHeqieDifficulty">进阶</view>
      <view class="diff-btn {{heqieDifficulty === 'hard' ? 'active' : ''}}"
            data-level="hard" bindtap="selectHeqieDifficulty">高级</view>
    </view>
    <view class="start-btn heqie-start" bindtap="startHeqie">开始练习</view>
    <view class="mode-stats" wx:if="{{heqieStats && heqieStats.totalCount > 0}}">
      <text>已练{{heqieStats.totalCount}}题 · 正确率{{heqieCorrectRate}}%</text>
    </view>
  </view>

  <view class="stats-link" bindtap="goStats">练习统计 ></view>
</view>
```

**Step 4: 修改 index.wxss — 新增模式卡片样式**

在现有样式后追加：

```css
/* 覆盖旧样式 */
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 32rpx 40rpx;
  min-height: 100vh;
}
.title { font-size: 52rpx; font-weight: bold; color: #f0e6d2; }
.subtitle { font-size: 34rpx; color: #a8d8a8; margin-bottom: 48rpx; }

/* 模式卡片 */
.mode-section {
  width: 100%;
  background: rgba(255,255,255,0.06);
  border-radius: 16rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
}
.mode-header { display: flex; align-items: center; gap: 16rpx; margin-bottom: 20rpx; }
.mode-icon { font-size: 40rpx; }
.mode-info { display: flex; flex-direction: column; }
.mode-title { font-size: 32rpx; font-weight: bold; color: #f0e6d2; }
.mode-desc { font-size: 22rpx; color: #a8d8a8; }

.diff-buttons { display: flex; justify-content: center; gap: 16rpx; margin-bottom: 20rpx; }
.diff-btn {
  padding: 12rpx 32rpx; border: 2rpx solid #a8d8a8;
  border-radius: 8rpx; font-size: 26rpx; color: #a8d8a8;
}
.diff-btn.active { background: #a8d8a8; color: #0d5a2a; font-weight: bold; }

.start-btn {
  width: 100%; height: 80rpx; background: #e8c840; color: #2c1810;
  font-size: 32rpx; font-weight: bold; border-radius: 40rpx;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.2);
}

.heqie-start { background: #5c9aff; color: #fff; }

.mode-stats { text-align: center; font-size: 22rpx; color: #a8d8a8; margin-top: 12rpx; }

.stats-link {
  font-size: 26rpx; color: #a8d8a8; margin-top: 16rpx;
  padding: 12rpx 24rpx;
}
```

**Step 5: 在微信开发者工具中验证**

检查：
- 首页显示两个模式卡片
- 各自有独立的难度选择
- 何切→跳转到 practice 页
- 河切→跳转到 heqie 页
- 两种题型都能正常出题和答题

**Step 6: Commit**

```bash
git add app.json pages/index/
git commit -m "feat: 首页改造 — 双模式入口+河切页面路由"
```

---

### Task 9: 端到端测试

为河切流程编写集成测试。

**Files:**
- Create: `core/__tests__/heqie-e2e.test.js`

**Step 1: 编写测试**

```javascript
const { dealHeqieScenario } = require('../heqie-dealer')
const { explainSafety, explainDiscard, formatSafetyResult } = require('../heqie-analyzer')
const { calcDanger, dangerToLevel } = require('../safety')
const { tilesToHandArray, tileToString } = require('../tiles')

function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg)
}

function runE2E() {
  console.log('=== 河切端到端测试 ===\n')

  // 各难度测试
  for (const diff of ['easy', 'medium', 'hard']) {
    console.log(`--- ${diff} 难度 ---`)
    const scenario = dealHeqieScenario(diff)
    assert(scenario !== null, `${diff} 场景生成`)
    assert(scenario.myHand.length === 14, `${diff} 手牌14张`)
    assert(scenario.rivers.length >= 1, `${diff} 有牌河`)

    console.log(`题型: ${scenario.questionType}`)
    console.log(`手牌: ${scenario.myHand.map(tileToString).join(' ')}`)
    console.log(`牌河数: ${scenario.rivers.length}`)
    for (let i = 0; i < scenario.rivers.length; i++) {
      console.log(`  对手${i+1}牌河: ${scenario.rivers[i].map(tileToString).join(' ')}`)
      if (scenario.openMelds[i].length > 0) {
        console.log(`  对手${i+1}明牌: ${scenario.openMelds[i].map(m => m.type + ':' + m.tiles.map(tileToString).join('')).join(' ')}`)
      }
    }

    if (scenario.questionType === 'safety') {
      console.log(`目标牌: ${tileToString(scenario.targetTile)}`)
      console.log(`正确危险度: ${scenario.correctDanger} (${['安全','注意','危险'][scenario.correctLevel]})`)
      const handArr = tilesToHandArray(scenario.myHand)
      const explain = explainSafety(scenario.targetTile, scenario.rivers[0], scenario.openMelds[0], handArr, scenario.myFeeds[0], scenario.turnNumber)
      console.log(`解析: ${explain}`)
      assert(explain.length > 5, '安全解析有内容')
    } else {
      console.log(`最优弃牌: ${tileToString(scenario.bestTile)}`)
      assert(scenario.analysis.length >= 2, '弃牌分析有内容')
    }

    console.log()
  }

  // 稳定性测试
  console.log('--- 稳定性: 连续30局 ---')
  let ok = 0
  for (let i = 0; i < 30; i++) {
    const diffs = ['easy', 'medium', 'hard']
    const s = dealHeqieScenario(diffs[i % 3])
    if (s && s.myHand.length === 14) ok++
  }
  console.log(`成功 ${ok}/30`)
  assert(ok >= 25, '至少83%成功率')

  console.log('\n=== 河切端到端测试全部通过 ===')
}

runE2E()
```

**Step 2: 运行测试**

```bash
node core/__tests__/heqie-e2e.test.js
```

Expected: 河切端到端测试全部通过

**Step 3: 同时运行所有已有测试确保无回归**

```bash
node core/__tests__/tiles.test.js && node core/__tests__/shanten.test.js && node core/__tests__/efficiency.test.js && node core/__tests__/dealer.test.js && node core/__tests__/e2e.test.js && node core/__tests__/heqie-e2e.test.js
```

Expected: 全部通过

**Step 4: Commit**

```bash
git add core/__tests__/heqie-e2e.test.js
git commit -m "test: 河切端到端测试 — 场景生成+解析+稳定性"
```

---

### Task 10: 最终集成验证 + Push

在微信开发者工具中做完整的手动测试，确认所有功能正常后推送到 GitHub。

**Step 1: 在微信开发者工具中依次测试**

- [ ] 首页显示何切和河切两个模式
- [ ] 何切练习：仿真牌面（万筒条风箭财神各花色正确显示）
- [ ] 何切练习：选牌、确认、解析、下一题流程正常
- [ ] 河切入门：只显示1家牌河，安全判断题为主
- [ ] 河切进阶：显示2家牌河，混合题型
- [ ] 河切高级：显示3家牌河，攻守弃牌为主
- [ ] 承包提示：当 myFeeds >= 2 时显示警告
- [ ] 牌河中的小号牌正常显示
- [ ] 统计页面显示河切统计

**Step 2: 修复发现的问题**

根据手动测试结果修复 bug（如有）。

**Step 3: Push to GitHub**

```bash
git push
```

**Step 4: Commit message 如有修复**

```bash
git add -A
git commit -m "fix: 集成测试修复"
git push
```
