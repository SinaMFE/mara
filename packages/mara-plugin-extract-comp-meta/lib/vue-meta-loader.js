const { customSerializeVueFiles } = require('sina-meta-serialize')
const { options } = require('./config')

module.exports = function(source, map) {
  const { resourceQuery, resourcePath } = this
  const isBlock = resourceQuery.includes('&type=')
  const hasDecorator = resourceQuery.includes('@SComponent')

  if (isBlock || !hasDecorator) {
    return this.callback(null, source, map)
  }

  const meta = customSerializeVueFiles([resourcePath], options)
  console.log(meta)

  source += `\ncomponent.options.__meta = ${JSON.stringify(meta)}`

  this.callback(null, source, map)
}
