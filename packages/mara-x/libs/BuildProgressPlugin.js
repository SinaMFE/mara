'use strict'

const WebpackProgressPlugin = require('webpack/lib/ProgressPlugin')
const ProgressBar = require('./ProgressBar')

module.exports = class BuildProgressPlugin {
  constructor(options) {
    const defOpt = {
      name: '',
      spinner: null,
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
    this.progressBar = new ProgressBar({
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

    this.progressBar.update(percent)
  }

  progressDetails(percent, msg) {
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
  }
}
