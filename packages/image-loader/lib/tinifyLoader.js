const tinify = require('tinify')
const cacache = require('cacache')
const findCacheDir = require('find-cache-dir')
const { interpolateName, getHashDigest } = require('loader-utils')
const { random, resultPath } = require('./util')

const TOTAL_MONTH_COUNT = 500
const TINIFY_SOURCE_MAP = '_tinifySourceMap'
const CACHE_DIR = findCacheDir({ name: 'mara-image-loader' })
const invalidTokens = []
let clientFactory = null

const arrivalLimit = count => count === TOTAL_MONTH_COUNT

const getTinifyClient = tokenSet => {
  const token = [...tokenSet][random(0, tokenSet.size - 1)]

  tinify.key = token

  return tinify
    .validate()
    .then(() => {
      // console.log(
      //   'get client',
      //   token,
      //   TOTAL_MONTH_COUNT - tinify.compressionCount
      // )

      return tinify
    })
    .catch(err => {
      if (err instanceof tinify.AccountError) {
        // delete invalid token
        tokenSet.delete(token)
        invalidTokens.push(token)

        if (tokenSet.size) return getTinifyClient(tokenSet)

        throw new Error(`Invalid tokens ${invalidTokens}\n${err.message}`)
      }

      throw new Error(err)
    })
}

const replaceHash = (name, hash) => {
  // `hash` and `contenthash` are same in `loader-utils` context
  // let's keep `hash` for backward compatibility
  const reg = /\[(?:hash|contenthash)(?::(\d+))?\]/gi

  return name.replace(reg, (match, maxLength) =>
    hash.substring(0, parseInt(maxLength, 10))
  )
}

const compress = image => {
  const src = Buffer.isBuffer(image) ? 'fromBuffer' : 'fromFile'

  return clientFactory().then(client => client[src](image).toBuffer())
}

const setCache = (key, data) => {
  return cacache.put(CACHE_DIR, key, data).then(integrity => data)
}

const getCache = key => {
  return cacache.get(CACHE_DIR, key).then(cache => cache.data)
}

const createClientFactory = keys => {
  let client = null
  const tokenSet = new Set(keys)

  return () => {
    if (client && !arrivalLimit(client.compressionCount)) {
      return client
    }

    client = getTinifyClient(tokenSet)

    return client
  }
}

const tinyImg = buffer => {
  const id = getHashDigest(buffer)
  const output = (content, cache = true) => ({ originHash: id, content, cache })

  return getCache(id)
    .then(output)
    .catch(e => {
      return compress(buffer)
        .then(setCache.bind(null, id))
        .then(content => output(content, false))
    })
}

function emitSourceMap(ctx, dist) {
  if (ctx._compiler[TINIFY_SOURCE_MAP]) {
    ctx._compiler[TINIFY_SOURCE_MAP][dist] = ctx.resourcePath
  } else {
    ctx._compiler[TINIFY_SOURCE_MAP] = { [dist]: ctx.resourcePath }
  }
}

module.exports = function loader(ctx, content, options) {
  const callback = ctx.async()

  if (!clientFactory) {
    // cache clientFactory
    clientFactory = createClientFactory(options.tinifyKeys)
  }

  tinyImg(content).then(({ originHash, cache, content }) => {
    let outputPath = interpolateName(ctx, options.name, {})
    outputPath = replaceHash(outputPath, originHash)

    ctx.emitFile(outputPath, content)
    !cache && emitSourceMap(ctx, outputPath)

    callback(null, resultPath(outputPath))
  })
}
