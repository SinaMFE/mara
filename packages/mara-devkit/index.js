const path = require('path')
const glob = require('glob').sync

glob(`${__dirname}/lib/*.js`).forEach(m => {
  exports[path.basename(m, '.js')] = require(m)
})

exports.chalk = require('chalk')
exports.execa = require('execa')
exports.resolve = require('resolve')
