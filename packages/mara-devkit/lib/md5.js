const { createHash } = require('crypto')
const isObject = require('./isObject')

module.exports = function md5(data) {
  const hash = createHash('md5')

  if (isObject(data)) {
    data = JSON.stringify(data)
  }

  return hash.update(data).digest('hex')
}
