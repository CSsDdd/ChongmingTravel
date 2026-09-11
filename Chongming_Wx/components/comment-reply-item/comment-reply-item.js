Component({
  properties: {
    reply: {
      type: Object,
      value: {},
      observer() {
        this.setData({
          expanded: false,
          canExpand: false,
          avatarFailed: false
        }, () => this.measureOverflow())
      }
    }
  },

  data: {
    expanded: false,
    canExpand: false,
    avatarFailed: false
  },

  lifetimes: {
    ready() {
      this.measureOverflow()
    }
  },

  methods: {
    measureOverflow() {
      wx.nextTick(() => {
        const query = this.createSelectorQuery()
        query.select('.reply-text').boundingClientRect()
        query.select('.reply-text-measure').boundingClientRect()
        query.exec(rects => {
          const [collapsedRect, fullRect] = rects || []
          if (!collapsedRect || !fullRect) return
          this.setData({ canExpand: fullRect.height > collapsedRect.height + 1 })
        })
      })
    },

    toggleExpanded() {
      this.setData({ expanded: !this.data.expanded })
    },

    handleAvatarError() {
      this.setData({ avatarFailed: true })
    },

    handleLike() {
      this.triggerEvent('like', { commentId: this.properties.reply.id })
    },

    handleReply() {
      this.triggerEvent('reply', { commentId: this.properties.reply.id })
    },

    handleMore() {
      this.triggerEvent('more', { commentId: this.properties.reply.id })
    }
  }
})
