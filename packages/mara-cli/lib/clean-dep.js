'use strict'

const ora = require('ora')
const fs = require('fs-extra')

function cleaner(targets, spinner) {
  return targets.map(file =>
    fs
      .remove(file)
      .then(() => spinner.succeed(file))
      .catch(() => spinner.fail(file))
  )
}

module.exports = async function(targets = []) {
  const spinner = ora(`Cleaning project...`)
  const task = cleaner(targets, spinner)

  return Promise.all(task)
}
