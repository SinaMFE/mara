const { interpolateName } = require('loader-utils')
const { resultPath } = require('./util')

module.exports = function loader(ctx, content, options) {
  const outputPath = interpolateName(ctx, options.name, {
    content
  })

  ctx.emitFile(outputPath, content)

  return resultPath(outputPath)
}
