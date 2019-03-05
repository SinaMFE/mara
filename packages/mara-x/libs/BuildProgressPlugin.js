'use strict'

const WebpackProgressPlugin = require('webpack/lib/ProgressPlugin')
const ProgressBar = require('./ProgressBar')
const readline = require('readline')

class ProcessDetails {
  constructor({ stdout = process.stderr, spinner, name }) {
    this.stdout = stdout
    this.spinner = spinner
    this.name = name ? `${name}:` : ''
  }

  _clearLine() {
    readline.clearLine(this.stdout, 0)
    readline.cursorTo(this.stdout, 0)
  }

  update(percent, msg, details) {
    if (percent < 1) {
      percent = Math.floor(percent * 100)
      msg = `${percent}% ${msg}`

      if (percent < 100) {
        msg = ` ${msg}`
      }
      if (percent < 10) {
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

    msg = this.name + msg

    if (this.spinner) {
      this.spinner.text = msg
      return
    }

    readline.cursorTo(this.stdout, 0)
    this.stdout.write(msg)
  }

  stop() {
    this._clearLine(this.stdout)
  }
}

module.exports = class BuildProgressPlugin {
  constructor(options) {
    const defOpt = {
      name: '',
      spinner: null,
      type: '',
      stdout: process.stderr
    }

    this.options = Object.assign(defOpt, options)

    const stdout = this.options.stdout
    const spinner = this.options.spinner
    // const spinner = null

    if (!stdout.isTTY) return () => {}

    this.progressPlugin = new WebpackProgressPlugin(
      this.buildProgress.bind(this)
    )

    const ProcessRender =
      this.options.type === 'text' ? ProcessDetails : ProgressBar
    this.progressBar = new ProcessRender({
      spinner,
      stdout,
      name: this.options.name
    })
  }

  apply(compiler) {
    this.progressPlugin.apply(compiler)
  }

  buildProgress(percent, msg, ...args) {
    const details = args

    if (percent === 1) {
      return this.progressBar.stop()
    }

    this.progressBar.update(percent, msg, details)
  }
}
