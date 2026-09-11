Component({
  properties: {
    comment: {
      type: Object,
      value: {},
      observer() {
        this.setData({
          expanded: false,
          canExpand: false,
          avatarFailed: false
        }, () => {
          this.measureOverflow()
        })
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
        query.select('.comment-text').boundingClientRect()
        query.select('.comment-text-measure').boundingClientRect()
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
      this.triggerEvent('like', { commentId: this.properties.comment.id })
    },

    handleReply() {
      this.triggerEvent('reply', { commentId: this.properties.comment.id })
    },

    handleMore() {
      this.triggerEvent('more', { commentId: this.properties.comment.id })
    },

    forwardReplyLike(event) {
      this.triggerEvent('like', event.detail)
    },

    forwardReply(event) {
      this.triggerEvent('reply', event.detail)
    },

    forwardReplyMore(event) {
      this.triggerEvent('more', event.detail)
    }
  }
})
