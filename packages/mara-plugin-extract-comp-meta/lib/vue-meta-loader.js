const {
  removeCompilationStageDecoratorsForVueFile
} = require('sina-meta-serialize')
const { dropOptions, vueFiles } = require('./config')

function dropDesignDecorators(source) {
  return removeCompilationStageDecoratorsForVueFile(source, dropOptions)
}

module.exports = function(source, map) {
  const { resourceQuery, resourcePath } = this
  // includes vue&type=
  const isBlock = resourceQuery !== ''
  const hasDecorator = source.includes('@SComponent')

  if (isBlock || !hasDecorator) {
    return this.callback(null, source, map)
  }

  vueFiles.add(resourcePath)
  source = dropDesignDecorators(source)

  this.callback(null, source, map)
}
