'use strict'

const { TYPE } = require('../core/const')

function isStyleWarning(err) {
  if (err.name != 'ModuleWarning') return false

  const file = err.file

  return file.endsWith('.css') || file.includes('type=style')
}

function transform(error) {
  if (isStyleWarning(error)) {
    return Object.assign({}, error, {
      message: error.message,
      type: TYPE.STYLE_WARNING,
      name: 'Style warning'
    })
  }

  return error
}

module.exports = transform
