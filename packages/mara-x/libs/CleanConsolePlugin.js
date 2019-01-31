const clearConsole = require('react-dev-utils/clearConsole')
const isInteractive = process.stdout.isTTY

module.exports = class CleanConsolePlugin {
  apply(compiler) {
    const pluginName = this.constructor.name

    compiler.hooks.invalid.tap(pluginName, this.clearConsole)
    compiler.hooks.done.tap(pluginName, this.clearConsole)
  }

  clearConsole() {
    isInteractive && clearConsole()
  }
}
