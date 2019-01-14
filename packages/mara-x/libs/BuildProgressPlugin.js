'use strict'

const WebpackProgressPlugin = require('webpack/lib/ProgressPlugin')

module.exports = class BuildProgressPlugin {
  constructor(options) {
    const defOpt = {
      spinner: null
    }

    this.options = Object.assign(defOpt, options)
    this.spinner = this.options.spinner
    this.lineCaretPosition = 0
    this.isInteractive = process.stdout.isTTY
    this.progress = new WebpackProgressPlugin(this.buildProgress.bind(this))
  }

  apply(compiler) {
    this.progress.apply(compiler)
  }

  buildProgress(percentage, msg, ...args) {
    const details = args

    if (percentage < 1) {
      percentage = Math.floor(percentage * 100)
      msg = `${percentage}% ${msg}`

      if (percentage < 100) {
        msg = ` ${msg}`
      }
      if (percentage < 10) {
        msg = ` ${msg}`
      }

      for (let detail of details) {
        if (!detail) continue

        if (detail.length > 40) {
          detail = '...'
        }
        msg += ` ${detail}`
      }
    }

    if (this.spinner) {
      this.spinner.text = msg
    } else {
      this.goToLineStart(msg)
      process.stderr.write(msg)
    }
  }

  goToLineStart(nextMessage) {
    let str = ''

    for (
      ;
      this.lineCaretPosition > nextMessage.length;
      this.lineCaretPosition--
    ) {
      str += '\b \b'
    }
    for (var i = 0; i < this.lineCaretPosition; i++) {
      str += '\b'
    }
    this.lineCaretPosition = nextMessage.length
    if (str) process.stderr.write(str)
  }
}
