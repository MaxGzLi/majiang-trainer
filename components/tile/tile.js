const { tileToString, isJoker } = require('../../core/tiles')

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
    imgSrc: '',
    isJoker: false
  },
  observers: {
    'tileId': function(id) {
      if (id < 0) return
      this.setData({
        label: tileToString(id),
        imgSrc: '/images/tiles/' + id + '.png',
        isJoker: isJoker(id)
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
