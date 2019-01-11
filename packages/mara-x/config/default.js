'use strict'

module.exports = {
  hash: {
    main: true,
    chunk: true
  },
  globalEnv: {},
  // 用于生成未压缩文件
  debug: false,
  // 预渲染页面，直出首屏模板，依赖 Puppeteer
  prerender: false,
  // 相对路径更加常用
  publicPath: './',
  publicDevPath: '/',
  sourceMap: false,
  library: {
    root: 'MyLibrary',
    amd: '',
    commonjs: ''
  },
  tsImportLibs: [],
  // 编译配置
  compiler: {
    // 提取 css 到额外的文件
    cssExtract: true,
    // 多版本依赖检测
    checkDuplicatePackage: true,
    // 默认启用 runtime，仅允许 vue 文件内的模板
    vueRuntimeOnly: true,
    // @TODO 移除 console
    dropConsole: false
  },
  webpackPluginsHandler: (command, webpackConf) => webpackConf,
  proxyTable: {},
  babelPlugins: [],
  ciConfig: {},
  // 通知 babel 编译 node_module 里额外的模块
  esm: ['@mfelibs'],
  // 打包 dll
  vendor: [],
  devServer: {
    open: true,
    port: 3022,
    https: false,
    proxy: {}
  },
  ftp: {
    host: '', // 主机
    port: 0,
    user: '',
    password: '',
    reload: true, // 刷新缓存
    openBrowser: true, // 上传完毕后自动打开浏览器
    remotePath: {
      version: false // 添加 version 路径
    }
  },
  // hybrid 项目配置，存在此属性时，将会生成 zip 包
  hybrid: {}
}
