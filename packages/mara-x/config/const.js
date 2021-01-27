const GLOB = {
  MAIN_ENTRY: 'index.@(ts|tsx|js|jsx)',
  SERVANT_ENTRY: 'index.*.@(ts|tsx|js|jsx)',
  LIB_ENTRY: 'src/index.@(ts|js)'
}

const TARGET = {
  WEB: 'web',
  WAP: 'wap',
  APP: 'app'
}

const DEPLOY_ENV = {
  DEV: 'dev',
  TEST: 'test',
  ONLINE: 'online'
}

module.exports = {
  GLOB,
  TARGET,
  DEPLOY_ENV,
  LIB_DIR: 'lib',
  DIST_DIR: 'dist',
  SRC_DIR: 'src',
  VIEW_DIR: 'src/view',
  VIEWS_DIR: 'src/views',
  WORKSPACE_PROJECT_DIR: 'projects',
  PUBLIC_DIR: 'public',
  PACKAGE_JSON: 'package.json',
  MANIFEST: 'manifest.json',
  MARA_CONF: 'marauder.config.js',
  DLL_DIR: 'dll',
  PUBLIC_PATH: './',
  HYBRID_PUBLIC_PATH: './',
  DEV_PUBLIC_PATH: '/',
  UNI_SNC: '__UNI_SNC__'
}
