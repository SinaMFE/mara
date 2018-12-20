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
  ts: {
    default: true,
    describe: 'use typescript',
    type: 'boolean'
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
