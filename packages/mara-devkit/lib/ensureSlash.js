module.exports = function ensureSlash(pathStr, needsSlash = true) {
  const hasSlash = pathStr.endsWith('/')

  if (hasSlash && !needsSlash) {
    return pathStr.substr(pathStr, pathStr.length - 1)
  } else if (!hasSlash && needsSlash) {
    return `${pathStr}/`
  } else {
    return pathStr
  }
}
