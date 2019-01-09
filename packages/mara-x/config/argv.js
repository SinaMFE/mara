const mri = require('mri')

// rawArgv 是当前 bin 脚本的参数，为 bin 以后的内容
// 如 marax build index => rawArgv: ['build', 'index']
const rawArgv = process.argv.slice(2)

module.exports = mri(rawArgv, {
  alias: { version: 'v' },
  boolean: ['version', 'debug', 'report'],
  string: ['target', 'test', 'ftp'],
  default: { debug: false, version: false }
})
