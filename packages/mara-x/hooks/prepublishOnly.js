const config = require('../config')
const { isInstalled } = require('../libs/utils')

if (isInstalled('@mara/plugin-extract-comp-meta')) {
  const plugin = require('@mara/plugin-extract-comp-meta')

  plugin({ config })
}
