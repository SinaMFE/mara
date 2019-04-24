const chalk = require('chalk')

const bgColor = {
  dark: [85, 85, 85],
  danger: [224, 93, 68],
  warning: [219, 171, 9],
  info: [0, 126, 198],
  success: [68, 204, 17]
}

module.exports = function badge(title, value, severity) {
  severity = bgColor[severity] ? severity : 'info'

  return (
    chalk.bgRgb(...bgColor['dark']).white('', title, '') +
    chalk.bgRgb(...bgColor[severity]).white('', value, '')
  )
}
