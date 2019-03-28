# marax

[![npm](https://img.shields.io/npm/v/@mara/x.svg)](https://www.npmjs.com/package/@mara/x)

支持 React / Vue + Ts 的多页应用打包工具。

**灵感**
站在巨人的肩膀上。`marax` 受众多开源项目启发，持续跟进并融合了 [create-react-app](https://github.com/facebook/create-react-app) 及 [vue-cli](https://github.com/vuejs/vue-cli) 的核心配置，旨在为 React/Vue/Js/Ts 等不同技术栈项目提供**一致性**的构建流程与**开箱即用**的开发体验。

## 安装

> 依赖 Node.js 8.10.0+

推荐使用 marax 配套的项目生成工具 [@mara/create](https://www.npmjs.com/package/@mara/create) 创建项目

```bash
npx @mara/create my-app
```

### 手动安装

也可以在现有项目中手动安装 @mara/x

```bash
yarn add @mara/x -D
```

### 配置 npm script

`package.json` 中配置 npm-script

```bash
"scripts": {
  "dev": "marax dev",
  "build": "marax build"
 },
 ...
```

## 命令

marax 提供开箱即用的多页应用打包服务，在 marax 中**页面**又称为**视图(view)**，存放于 `src/views` 目录下。

我们约定，一个典型的**页面**应至少包含一个 `index.html` 文件和一个 `index.js` 文件。

一个项目应至少含有一个页面。

### 启动开发环境

运行开发命令在本地启动一个开发服务器，默认端口号 `3022`。

```bash
npm run dev [view_name]
```

当 views 下存在多个页面时，dev 命令需指定页面名（view_name），缺省情况下将进入交互模式进行选择。
当只有一个页面时页面名可省略。

示例：

```bash
# 在 index 页面下开发
npm run dev index
```

### 打包项目

打包页面，将在 `dist/<view_name>` 目录下输出构建结果

```bash
npm run build [view_name]
```

当 views 下存在多个页面时，需显式指定或交互式选择页面名。单页时页面名可省略。

示例：

```bash
# 打包 index 页面
npm run build index
```

#### FTP 上传

在 build 模式下可配置使用 ftp 上传功能，需在项目根目录创建 `marauder.config.js` 文件，并注册 ftp 账号信息。

通过 `--ftp` 参数指定将打包结果上传 ftp。为方便多分支测试，当传递 `branch_name` 值时，将创建 branch 文件夹作路径隔离。

```bash
npm run build [view_name] --ftp [branch_name]
```

示例：

```bash
#  打包 index 页面，并上传至测试地址
npm run build index --ftp

#  打包 index 页面，并通过上传至测试地址下的 feed_feature 文件夹中
npm run build index --ftp feed_feature
```

#### Test 发布\*

使用 Test 发布功能，需在 `marauder.config.js` 中注册 gitlab privateToken 信息。

在 `build` 命令基础上，可通过添加 `--test` 参数发布到测试环境。

```bash
npm run build [view_name] --test [tag_message]
```

### 打包 dll 文件

`marauder.config.js` 中配置 `vendor` 信息

```
vendor: ['react', 'react-router']
```

运行 `dll` 命令生成公共资源包，执行结果将会输出到 `dist/vendor` 文件夹下

```bash
npm run dll

# 打包 dll 文件，并上传至文件服务器
npm run dll --ftp
```

### 组件打包

`marax` 除了支持项目打包外，也可作为组件打包工具。

在工程 `src` 文件夹中创建 `index.js` 文件作为组件入口

npm-script 中配置

```json
"build": "marax lib"
```

打包

```bash
npm run build
```

打包后文件将在 `lib` 目录中输出

## 教程

### 代码分割

#### 动态代码分割

使用动态 import 方法生成动态 chunk 包

```javascript
import('./my-module.js').then(module => {
  // Do something with the module.
})
```

这种使用方式也支持 await 关键字。

```javascript
let module = await import('/modules/my-module.js')
```

#### 静态代码分割

此功能可零配置启用，凡是在 `views/<view_name>/` 下符合命名约定 `index.<chunk_name>.js` 的文件均会被视为 `chunk` 包拆分，拆分后的 bundle 文件以 `<chunk_name>.servant.js` 命名，这里称之为 `servant` 包。

其中 `chunk_name` 为拆分入口的名称，例如 `index.foo.js` 构建后将生成 `foo.servant.js`

`<chunk_name>.servant.js` 文件将只会在生产环境(build)生成，在开发环境(dev)中，所有的 servant 将合并到 entry 中引入。对于使用者来说一切都是无感知的。

**注意**
由于 entry bundle 中已经包含 `polyfill`（Promise，Object.assign），为了避免打包不必要冗余，通过此方式拆分出的 servant 包将不包含 polyfill 内容。为安全起见，建议将 servant 包置于 entry 之后引入（除非您清楚 servant 中不会触发兼容性问题），这也是取名为 `servant` 的本意。`webpack-marauder` 已为您默认配置好一切。

#### 打包 vendor

默认的，marax 会自动拆分 vendor 包。
