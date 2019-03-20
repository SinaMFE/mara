const glob = require('glob')
const paths = require('../config/paths')
const {
  dependencies: dep = {},
  devDependencies: devDep = {}
} = require(paths.packageJson)

function getAppFramework(entry) {
  if (dep.vue || devDep.vue) {
    const vueFiles = glob(`src/view/${entry}/**/*.vue`)

    if (vueFiles.length) return 'vue'
  }

  if (dep.react || devDep.vue) {
    const vueFiles = glob(`src/view/${entry}/**/*.vue`)

    if (vueFiles.length) return 'vue'
  }
}

module.exports = getAppFramework
