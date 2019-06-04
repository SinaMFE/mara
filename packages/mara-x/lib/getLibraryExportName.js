const { isObject } = require('@mara/devkit')

function getLibName(name) {
  const str = name.replace(/^@\w+\//i, '').replace(/_|-/g, '.')
  const camelCaseByDot = name => {
    const upperFirstChar = str =>
      str.replace(/^[a-z]{1}/, match => match.toUpperCase())
    return name.split('.').reduce((camel, cur) => camel + upperFirstChar(cur))
  }

  return camelCaseByDot(str)
}

function toCamelCase(name) {
  const upperFirstChar = str =>
    str.replace(/^[a-z]{1}/, match => match.toUpperCase())
  const dotName = name.replace(/_|-/g, '.')

  return dotName.split('.').reduce((camel, cur) => camel + upperFirstChar(cur))
}

function getUmdName(name) {
  if (isObject(name)) {
    const { amd, commonjs, root } = name

    return { amd, commonjs, root }
  }

  return {
    amd: name,
    commonjs: name,
    root: toCamelCase(name)
  }
}

// 支持对象配置
// 区分 amd, commonjs, root, umd 配置
// 对象配置支持省略
function getLibraryExportName(format, pkgName) {
  if (!pkgName) return

  if (isObject(pkgName)) {
    if (format === 'umd') return getUmdName(pkgName)

    return getLibraryExportName(format, pkgName[format])
  }

  const pureName = pkgName.replace(/^@\w+\//i, '')

  switch (format) {
    case 'var':
    case 'root':
      return toCamelCase(pureName)
    case 'umd':
      return getUmdName(pureName)
    case 'amd':
    case 'commonjs':
    default:
      return pureName
  }
}

module.exports = { getLibraryExportName, getLibName }
