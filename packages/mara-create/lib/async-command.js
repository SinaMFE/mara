'use strict'

function success(result) {
  result && process.stdout.write(result + '\n')
  process.exit(0)
}

function fail(err) {
  process.stderr.write(String(err) + '\n')
  process.exit(err.exitCode || 1)
}

module.exports = options => ({
  ...options,
  handler(argv) {
    let res = options.handler(argv)
    if (res && res.then) res.then(success, fail)
  },
})
