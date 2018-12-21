module.exports = {
  'use-npm': {
    default: false,
    describe: 'use npm when installing dependencies',
    type: 'boolean'
  },
  'use-pnp': {
    default: false,
    describe: 'use yarn pnp',
    type: 'boolean'
  },
  'no-ts': {
    default: false,
    describe: `don't use typescript`,
    type: 'boolean'
  },
  framework: {
    default: 'vue',
    describe: 'app framework',
    type: 'string'
  },
  spkg: {
    default: false,
    describe: 'use component template',
    type: 'boolean'
  },
  force: {
    default: false,
    alias: 'f',
    describe: 'overwrite target directory if it exists',
    type: 'boolean'
  }
}
