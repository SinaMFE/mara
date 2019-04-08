const config = require('./index')
const getEnv = require('./env')
const { TARGET, HYBRID_PUBLIC_PATH, DEV_PUBLIC_PATH } = require('./const')
const resolvePublicPath = require('../libs/resolvePublicPath')
const { getGitRepoName } = require('../libs/utils')
const { deployEnv, globalEnv, paths, target } = config
const isDev = process.env.NODE_ENV === 'development'

async function getPublicPath(view, version) {
  if (isDev) return DEV_PUBLIC_PATH

  // hybrid 使用相对路径引用本地资源
  if (target === TARGET.APP) {
    return HYBRID_PUBLIC_PATH
  } else {
    let repoName = ''
    const pkgName = require(paths.packageJson).name

    try {
      repoName = await getGitRepoName()
    } catch (e) {}

    return resolvePublicPath(config.publicPath, deployEnv, {
      // repo 优先
      project: repoName || pkgName,
      repo: repoName,
      version,
      view
    })
  }
}

module.exports = async function getContext({ version, view }) {
  const publicPath = await getPublicPath(view, version)
  const buildEnv = getEnv({
    deployEnv,
    globalEnv,
    publicPath
  })

  return {
    entry: view,
    version,
    publicPath,
    buildEnv,
    // 优先读取 target，其次以 jsbridgeBuildType 回退
    target
  }
}
