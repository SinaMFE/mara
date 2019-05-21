class InlineUmdHtmlPlugin {
  constructor(htmlWebpackPlugin) {
    this.htmlWebpackPlugin = htmlWebpackPlugin
  }

  getInlinedTag(inject, injectLink) {
    return injectLink
      .filter(tag => tag.inject == inject)
      .map(tag => ({
        tagName: 'script',
        attributes: { src: tag.onlineUrl },
        closeTag: true
      }))
  }

  apply(compiler) {
    compiler.hooks.afterCompile.tap(this.constructor.name, compilation => {
      const { injectLink } = compiler.options

      if (!injectLink || !injectLink.length) return

      const headTags = this.getInlinedTag('head', injectLink)
      const bodyTags = this.getInlinedTag('body', injectLink)

      const hooks = this.htmlWebpackPlugin.getHooks(compilation)
      hooks.alterAssetTagGroups.tap(this.constructor.name, assets => {
        assets.headTags = headTags.concat(assets.headTags)
        assets.bodyTags = bodyTags.concat(assets.bodyTags)
      })
    })
  }
}

module.exports = InlineUmdHtmlPlugin
