const chalk = require('chalk')

const project = `
  src
  └── views ${chalk.green('-- 视图目录')}
      ├── index
      │   ├── ${chalk.yellowBright('index.(js|ts)')} ${chalk.green('-- 必须')}
      │   └── index.html ${chalk.green('-- 必须')}
      └── other
          ├── ...
          └── ...`

const library = `
  src
  ├── ${chalk.yellowBright('index.(js|ts)')} ${chalk.green(
  '-- lib 入口文件，必须'
)}
  └── views
      └── demo ${chalk.green('-- demo 页面，可选')}
          ├── index.(js|ts)
          └── index.html`

module.exports = { project, library }
