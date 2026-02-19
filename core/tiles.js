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

function isNumeric(id) {
  return id <= 26
}

function getSuit(id) {
  if (id <= 8) return 0
  if (id <= 17) return 1
  if (id <= 26) return 2
  if (id <= 30) return 3
  return 4
}

function getNumber(id) {
  if (id <= 8) return id + 1
  if (id <= 17) return id - 8
  if (id <= 26) return id - 17
  return -1
}

function createHandArray() {
  return new Array(34).fill(0)
}

function tilesToHandArray(tiles) {
  const hand = createHandArray()
  for (const t of tiles) hand[t]++
  return hand
}

function handArrayToTiles(hand) {
  const tiles = []
  for (let i = 0; i < 34; i++) {
    for (let j = 0; j < hand[i]; j++) tiles.push(i)
  }
  return tiles
}

function createWall() {
  const wall = []
  for (let i = 0; i < 34; i++) {
    for (let j = 0; j < 4; j++) wall.push(i)
  }
  return wall
}

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
