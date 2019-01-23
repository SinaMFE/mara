module.exports = {
  'use-npm': {
    describe: 'use npm when installing dependencies',
    type: 'boolean'
  },
  'use-pnp': {
    describe: 'use yarn pnp',
    type: 'boolean'
  },
  'no-ts': {
    describe: `don't use typescript`,
    type: 'boolean'
  },
  preset: {
    alias: 'p',
    default: 'vue',
    describe: 'use preset template',
    type: 'string'
  },
  spkg: {
    describe: 'use component template',
    type: 'boolean'
  },
  force: {
    alias: 'f',
    describe: 'overwrite target directory if it exists',
    type: 'boolean'
  }
}
