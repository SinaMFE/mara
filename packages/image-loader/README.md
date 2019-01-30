# @mara/image-loader

A loader for webpack which compress png/svg/jpg images.

- Use `tinify` to compress `png`/`jpg`
  - Cache tinify results
  - Dynamic scheduling tinify keys
- Use `svgo` to compress `svg`

## Install

```bash
yarn add @mara/image-loader -D
```

## Usage

**webpack.config.js**

With `url-loader`:

```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.(bmp|png|jpe?g|gif|webp|svg)$/,
        loader: require.resolve('url-loader'),
        options: {
          limit: 1024 * 4,
          tinifyKeys: [tinify_key1, [...tinify_keyn]],
          minify: process.env.NODE_ENV === 'production',
          // use image-loader when a target file's size exceeds the limit
          fallback: require.resolve('@mara/image-loader'),
          name: `static/img/[name].[contenthash:8].[ext]`
        }
      }
    ]
  }
}
```

Use alone:

```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.(bmp|png|jpe?g|gif|webp|svg)$/,
        loader: require.resolve('@mara/image-loader'),
        options: {
          tinifyKeys: [tinify_key1, [...tinify_keyn]],
          minify: process.env.NODE_ENV === 'production',
          name: `static/img/[name].[contenthash:8].[ext]`
        }
      }
    ]
  }
}
```

## Options

| Name       | Type     | Default        | Description                                                                                                           |
| ---------- | -------- | -------------- | --------------------------------------------------------------------------------------------------------------------- |
| name       | string   | '[hash].[ext]' | Custom filename template. See [placeholders](https://github.com/webpack-contrib/file-loader#placeholders) for details |
| tinifyKeys | string[] | []             | Developer API keys from [tinypng.com](https://tinypng.com/)                                                           |
| minify     | boolean  | true           | Set false to disable compression, equivalent to `file-loader`                                                         |
