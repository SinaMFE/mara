const loaderMap = {
  'stylus-loader': {
    msg: 'To import Stylus files, you first need to install stylus-loader.',
    dep: ['stylus-loader', 'stylus']
  },
  'less-loader': {
    msg: 'To import Less files, you first need to install less-loader.',
    dep: ['less-loader', 'less']
  },
  'sass-loader': {
    msg: 'To import Sass files, you first need to install sass-loader.',
    dep: ['sass-loader', 'node-sass']
  },
  'art-template-loader': {
    msg:
      'To import Art templates, you first need to install art-template-loader.',
    dep: ['art-template-loader', 'art-template']
  }
}

module.exports = loaderMap
