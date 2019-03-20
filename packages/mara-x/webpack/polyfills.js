'use strict'

if (typeof Promise === 'undefined') {
  require('promise/lib/rejection-tracking').enable()
  window.Promise = require('promise/lib/es6-extensions')
}

// Object.assign() is commonly used with React.
// It will use the native implementation if it's present and isn't buggy.
Object.assign = require('object-assign')

// Support for...of (a commonly used syntax feature that requires Symbols)
require('core-js/es/symbol')
// Support iterable spread (...Set, ...Map)
require('core-js/es/array/from')

// In tests, polyfill requestAnimationFrame since jsdom doesn't provide it yet.
// We don't polyfill it in the browser--this is user's responsibility.
if (process.env.NODE_ENV === 'test') {
  require('raf').polyfill(global)
}
