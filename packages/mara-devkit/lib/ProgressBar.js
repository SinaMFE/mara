const tty = require('tty')
const { supportsColor } = require('chalk')
const readline = require('readline')

const clearLine = stdout => {
  if (!supportsColor) {
    if (stdout instanceof tty.WriteStream) {
      if (stdout.columns > 0) {
        stdout.write(`\r${' '.repeat(stdout.columns - 1)}`)
      }
      stdout.write(`\r`)
    }

    return
  }

  readline.clearLine(stdout, 0)
  readline.cursorTo(stdout, 0)
}

const toStartOfLine = stdout => {
  if (!supportsColor) {
    stdout.write('\r')
    return
  }

  readline.cursorTo(stdout, 0)
}

module.exports = class ProgressBar {
  constructor({
    total = 100,
    stdout = process.stderr,
    spinner,
    name,
    callback
  }) {
    this.delay = 16
    this.curr = 0
    this.stdout = stdout
    this.name = name ? `${name} ` : ''
    this.offsetLen = this.name.length + (spinner ? 3 : 0)
    this.total = total
    this.chars = ['#', '-']
    this.spinner = spinner
    this.maxWidth = 75
    this._callback = callback
    clearLine(stdout)
  }

  tick(len = 1) {
    if (this.curr >= this.total) return

    this.curr += len

    if (this.spinner) {
      this.render()
    } else if (!this.id) {
      // schedule render
      this.id = setTimeout(() => this.render(), this.delay)
    }
  }

  update(ratio) {
    const goal = Math.floor(ratio * this.total)
    const delta = goal - this.curr

    this.tick(delta)
  }

  cancelTick() {
    if (this.id) {
      clearTimeout(this.id)
      this.id = null
    }
  }

  stop() {
    // "stop" by setting current to end so `tick` becomes noop
    this.curr = this.total

    this.cancelTick()
    clearLine(this.stdout)
    if (this._callback) {
      this._callback(this)
    }
  }

  render() {
    // clear throttle
    this.cancelTick()

    let ratio = this.curr / this.total
    ratio = Math.min(Math.max(ratio, 0), 1)

    // progress without bar
    // let bar = ` ${this.curr}/${this.total}`;
    let bar = ` ${this.curr}%`

    // calculate size of actual bar
    const availableSpace = Math.max(0, this.stdout.columns - bar.length - 3)
    let width = Math.min(this.total, availableSpace) - this.offsetLen

    // limit width
    width = width > this.maxWidth ? this.maxWidth : width

    const completeLength = Math.round(width * ratio)
    const complete = this.chars[0].repeat(completeLength)
    const incomplete = this.chars[1].repeat(width - completeLength)
    bar = `${this.name}[${complete}${incomplete}]${bar}\n`

    if (this.spinner) {
      this.spinner.text = bar
      return
    }

    toStartOfLine(this.stdout)
    this.stdout.write(bar)
  }
}
