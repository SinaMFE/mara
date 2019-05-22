const config = require('../config')
const { isInstalled } = require('../lib/utils')

if (isInstalled('@mara/plugin-extract-comp-meta')) {
  const plugin = require('@mara/plugin-extract-comp-meta')

  plugin({ config })
}
