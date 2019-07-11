const { isInstalled } = require('../lib/utils')

module.exports = function applyHook(argv) {
  const hookName = argv._[1]

  if (isInstalled(`../hooks/${hookName}`)) {
    const mod = require(`../hooks/${hookName}`)

    if (typeof mod === 'function') mod(argv)
  }
}
