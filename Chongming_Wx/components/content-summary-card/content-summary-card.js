Component({
  properties: {
    content: {
      type: Object,
      value: {},
      observer() {
        this.setData({ imageFailed: false })
      }
    },
    interactive: {
      type: Boolean,
      value: false
    }
  },

  data: {
    imageFailed: false
  },

  methods: {
    handleTap() {
      if (!this.properties.interactive) return
      this.triggerEvent('select', { content: this.properties.content })
    },

    handleImageError() {
      this.setData({ imageFailed: true })
    }
  }
})
