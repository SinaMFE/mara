const concat = require('../utils').concat
const { TYPE } = require('../core/const')
const formatTitle = require('../utils/colors').formatTitle
const { removeLoaders } = require('../utils/index')

function messageFormatter(message) {
  return 'Style Warning: ' + message.split('\n').pop()
}

function displayWarning(severity, issue) {
  const baseError = formatTitle(severity, severity)
  const message = messageFormatter(issue.message)

  return concat(`${baseError} in ${issue.file}`, '', message, '')
}

function isStyleWarning(issue) {
  return issue.type === TYPE.STYLE_WARNING
}

function format(warnings, severity) {
  return warnings.filter(isStyleWarning).reduce((accum, warn) => {
    warn.file = removeLoaders(warn.file)

    return accum.concat(displayWarning(severity, warn))
  }, [])
}

module.exports = format
