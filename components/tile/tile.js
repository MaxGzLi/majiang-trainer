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
        this.triggerEvent('select', { tileId: this.data.tileId })
      }
    }
  }
})
