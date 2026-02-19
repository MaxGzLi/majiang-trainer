const { tileToString, isJoker, getSuit, getNumber, isNumeric } = require('../../core/tiles')

const CN_NUMBERS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九']
const FENG_CHARS = ['东', '南', '西', '北']
const JIAN_CHARS = ['中', '发']

Component({
  properties: {
    tileId: { type: Number, value: -1 },
    selected: { type: Boolean, value: false },
    disabled: { type: Boolean, value: false },
    showBest: { type: Boolean, value: false },
    small: { type: Boolean, value: false },
    dangerLevel: { type: Number, value: -1 }
  },
  data: {
    label: '',
    suitClass: '',
    suitType: '',
    number: 0,
    cnNumber: '',
    charLabel: '',
    jianColorClass: '',
    dots: [],
    bars: [],
    isOneTiao: false,
    isOneTong: false
  },
  observers: {
    'tileId': function(id) {
      if (id < 0) return
      const suit = getSuit(id)
      const suitClasses = ['wan', 'tong', 'tiao', 'feng', 'jian']

      let suitType = isJoker(id) ? 'joker' : suitClasses[suit]
      let number = getNumber(id)
      let cnNumber = ''
      let charLabel = ''
      let dots = []
      let bars = []
      let isOneTiao = false
      let isOneTong = false
      let jianColorClass = ''

      if (suitType === 'wan') {
        cnNumber = CN_NUMBERS[number]
      } else if (suitType === 'tong') {
        if (number === 1) {
          isOneTong = true
        } else {
          dots = this._getDotPositions(number)
        }
      } else if (suitType === 'tiao') {
        if (number === 1) {
          isOneTiao = true
        } else {
          bars = this._getBarPositions(number)
        }
      } else if (suitType === 'feng') {
        charLabel = FENG_CHARS[id - 27]
      } else if (suitType === 'jian') {
        charLabel = JIAN_CHARS[id - 31]
        const jianColorClasses = { '中': 'jian-zhong', '发': 'jian-fa' }
        jianColorClass = jianColorClasses[charLabel] || ''
      } else if (suitType === 'joker') {
        charLabel = '财'
      }

      this.setData({
        label: tileToString(id),
        suitClass: isJoker(id) ? 'joker' : suitClasses[suit],
        suitType: suitType,
        number: number,
        cnNumber: cnNumber,
        charLabel: charLabel,
        jianColorClass: jianColorClass,
        dots: dots,
        bars: bars,
        isOneTiao: isOneTiao,
        isOneTong: isOneTong
      })
    }
  },
  methods: {
    onTap() {
      if (!this.data.disabled) {
        this.triggerEvent('select', { tileId: this.data.tileId })
      }
    },
    _getDotPositions(num) {
      // 每行几个圆点
      const layouts = {
        2: [{ dots: 1 }, { dots: 1 }],
        3: [{ dots: 1 }, { dots: 1 }, { dots: 1 }],
        4: [{ dots: 2 }, { dots: 2 }],
        5: [{ dots: 2 }, { dots: 1 }, { dots: 2 }],
        6: [{ dots: 2 }, { dots: 2 }, { dots: 2 }],
        7: [{ dots: 2 }, { dots: 2 }, { dots: 2 }, { dots: 1 }],
        8: [{ dots: 2 }, { dots: 2 }, { dots: 2 }, { dots: 2 }],
        9: [{ dots: 3 }, { dots: 3 }, { dots: 3 }]
      }
      return layouts[num] || []
    },
    _getBarPositions(num) {
      // 每行几根竹节
      const layouts = {
        2: [{ bars: 2 }],
        3: [{ bars: 3 }],
        4: [{ bars: 2 }, { bars: 2 }],
        5: [{ bars: 2 }, { bars: 1 }, { bars: 2 }],
        6: [{ bars: 3 }, { bars: 3 }],
        7: [{ bars: 3 }, { bars: 1 }, { bars: 3 }],
        8: [{ bars: 2 }, { bars: 2 }, { bars: 2 }, { bars: 2 }],
        9: [{ bars: 3 }, { bars: 3 }, { bars: 3 }]
      }
      return layouts[num] || []
    }
  }
})
