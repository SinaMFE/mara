'use strict'

const concat = require('../utils').concat

function isRelative(module) {
  return module.startsWith('./') || module.startsWith('../')
}

function removeLoaders(file) {
  if (!file) return ''

  const split = file.split('!')
  const filePath = split[split.length - 1]

  return filePath.replace('?vue&type=script&lang=ts&', '')
}

function formatFileList(files) {
  const length = files.length

  if (!length) return ''

  return ` in ${files[0]}${files[1] ? `, ${files[1]}` : ''}${
    length > 2 ? ` and ${length - 2} other${length === 3 ? '' : 's'}` : ''
  }`
}

function formatGroup(group) {
  const files = group.errors
    .map(e => e.file)
    .filter(Boolean)
    .map(removeLoaders)

  return ` ${group.module}${formatFileList(files)}`
}

function forgetToInstall(missingDependencies, useYarn) {
  const moduleNames = missingDependencies.map(
    missingDependency => missingDependency.module
  )
  const install = useYarn ? 'yarn add' : 'npm install'
  const it = missingDependencies.length === 1 ? 'it' : 'them'

  return `To install ${it}, you can run: ${install} ${moduleNames.join(' ')}`
}

function dependenciesNotFound(dependencies, useYarn) {
  if (dependencies.length === 0) return

  const items = dependencies.map(formatGroup)
  const listPrefix = item => ` -${item}`

  return concat(
    dependencies.length > 1
      ? 'These dependencies were not found:'
      : 'This dependency was not found:',
    '',
    items.length > 1 ? items.map(listPrefix) : items,
    '',
    forgetToInstall(dependencies, useYarn)
  )
}

function relativeModulesNotFound(modules) {
  if (modules.length === 0) return

  return concat(
    modules.length === 1
      ? 'This relative module was not found:'
      : 'These relative modules were not found:',
    '',
    modules.map(formatGroup)
  )
}

function groupModules(errors) {
  const missingModule = new Map()

  errors.forEach(error => {
    if (!missingModule.has(error.module)) {
      missingModule.set(error.module, [])
    }
    missingModule.get(error.module).push(error)
  })

  return Array.from(missingModule.keys()).map(module => ({
    module: module,
    relative: isRelative(module),
    errors: missingModule.get(module)
  }))
}

function formatErrors(errors, useYarn) {
  if (errors.length === 0) {
    return []
  }

  const groups = groupModules(errors)

  const dependencies = groups.filter(group => !group.relative)
  const relativeModules = groups.filter(group => group.relative)

  return concat(
    dependenciesNotFound(dependencies, useYarn),
    dependencies.length && relativeModules.length ? ['', ''] : null,
    relativeModulesNotFound(relativeModules)
  )
}

function format(errors, severity, { useYarn = false }) {
  // 所有错误聚合展示
  return formatErrors(
    errors.filter(e => e.type === 'module-not-found'),
    useYarn
  )
}

module.exports = format
