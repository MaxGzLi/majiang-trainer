const tiles = require('../tiles')

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

  // tilesToHandArray / handArrayToTiles roundtrip
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
