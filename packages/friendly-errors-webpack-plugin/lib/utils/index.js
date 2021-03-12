'use strict'

const path = require('path')

/**
 * Concat and flattens non-null values.
 * Ex: concat(1, undefined, 2, [3, 4]) = [1, 2, 3, 4]
 */
function concat() {
  const args = Array.from(arguments).filter(e => e != null)
  const baseArray = Array.isArray(args[0]) ? args[0] : [args[0]]
  return Array.prototype.concat.apply(baseArray, args.slice(1))
}

/**
 * Dedupes array based on criterion returned from iteratee function.
 * Ex: uniqueBy(
 *     [{ id: 1 }, { id: 1 }, { id: 2 }],
 *     val => val.id
 * ) = [{ id: 1 }, { id: 2 }]
 */
function uniqueBy(arr, fun) {
  const seen = {}
  return arr.filter(el => {
    const e = fun(el)
    return !(e in seen) && (seen[e] = 1)
  })
}

function removeLoaders(file) {
  if (!file) return ''

  const split = file.split('!')
  const filePath = split[split.length - 1]
  const purePath = removeVueTypeSuffix(filePath)

  // 去除 vue-loader 附加后缀
  return purePath.startsWith('/')
    ? purePath
    : path.join(process.cwd(), purePath)
}

function removeVueTypeSuffix(file) {
  return file.replace(/\?vue&type=.+/, '').replace(/\.vue\.ts$/i, '.vue')
}

module.exports = {
  concat: concat,
  uniqueBy: uniqueBy,
  removeLoaders
}
