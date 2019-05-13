const chalk = require('chalk')
const formatTitle = require('../utils/colors').formatTitle
const concat = require('../utils').concat
const { TYPE } = require('../core/const')

function format(errors, severity, { useYarn }) {
  // 为了减少干扰，一次展示一条信息
  const err = errors.filter(e => e.type === TYPE.CANT_RESOVLE_LOADER)[0]

  if (!err) return []

  const title = `${formatTitle(severity, severity)} in ${err.file}`
  const { fix } = err
  const cmd = useYarn ? 'yarn add ' : 'npm install '

  if (fix) {
    return concat(
      title,
      '',
      fix.msg,
      '',
      `Just run \`${chalk.bold(cmd + fix.dep.join(' ') + ' -D')}\` to fix it.`,
      ''
    )
  }

  // shall we contine?

  return [
    title,
    `Failed to resolve loader: ${chalk.yellow(err.loader)}`,
    '\nYou may need to install the missing loader.'
  ]
}

module.exports = format
