const glob = require('glob')
const paths = require('../config/paths')
const C = require('../config/const')
const {
  dependencies: dep = {},
  devDependencies: devDep = {}
} = require(paths.packageJson)

function getAppFramework(view) {
  if (dep.vue || devDep.vue) {
    const vueFiles = glob(`${C.VIEWS_DIR}/${view}/**/*.vue`)

    if (vueFiles.length) return 'vue'
  }

  if (dep.react || devDep.vue) {
    const vueFiles = glob(`${C.VIEWS_DIR}/${view}/**/*.vue`)

    if (vueFiles.length) return 'vue'
  }
}

module.exports = getAppFramework
