const { getGitRepoName } = require('@mara/devkit')
const config = require('./index')
const getEnv = require('./env')
const { TARGET, HYBRID_PUBLIC_PATH, DEV_PUBLIC_PATH } = require('./const')
const resolvePublicPath = require('../lib/resolvePublicPath')
const { deployEnv, globalEnv, paths, target } = config
const isDev = process.env.NODE_ENV === 'development'

// 读取 manifest.json

async function getPublicPath({ view, project, version }) {
  if (isDev) return DEV_PUBLIC_PATH

  // hybrid 使用相对路径引用本地资源
  if (config.isHybridMode) {
    return HYBRID_PUBLIC_PATH
  } else {
    let repoName = ''
    let projectName = ''
    const pkgName = require(paths.packageJson).name

    try {
      repoName = await getGitRepoName()
    } catch (e) {}

    if (project) {
      projectName = project
    } else {
      // repo 优先
      projectName = repoName || pkgName
    }

    return resolvePublicPath(config.publicPath, deployEnv, {
      project: projectName,
      repo: repoName,
      version,
      view
    })
  }
}

module.exports = async function getContext({ version, view, project }) {
  const publicPath = await getPublicPath({ view, project, version })
  const buildEnv = getEnv({
    deployEnv,
    globalEnv,
    publicPath,
    version
  })

  return {
    entry: view,
    project,
    version,
    publicPath,
    buildEnv,
    // 优先读取 target，其次以 jsbridgeBuildType 回退
    target
  }
}
