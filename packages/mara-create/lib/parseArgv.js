const mri = require('mri')

module.exports = options => {
  const mriOpt = {
    alias: [],
    boolean: [],
    string: [],
    default: {}
  }

  for (let key in options) {
    const oopt = options[key]

    if (oopt['type'] === 'boolean') {
      mriOpt.boolean.push(key)
    } else if (oopt['type'] === 'string') {
      mriOpt.string.push(key)
    }

    if (oopt['alias']) {
      mriOpt.alias[key] = oopt['alias']
    }

    // default 可能为布尔值，因此使用属性存在判断
    if ('default' in oopt) {
      mriOpt.default[key] = oopt['default']
    }
  }

  return mri(process.argv.slice(2), mriOpt)
}
