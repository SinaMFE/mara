# Marauder

[![npm](https://img.shields.io/npm/v/@mara/x.svg)](https://www.npmjs.com/package/@mara/x)

> 挖掘机技术哪家强

Marauder 下一代工程化体系。

## Quick Overview

```sh
npx @mara/create my-app
cd my-app
yarn dev
```

_npx 依赖 npm v5.2 及更高版本_

## 新建项目

**依赖 node 8.10.0+**

Marauder 支持多种项目生成方式，以下命令均可一键生成 `Vue` + `Typescript` 项目：

**npx（推荐）**

```sh
npx @mara/create my-app
```

_需要 npm 5.2+ 版本_

**npm**

```sh
npm init @mara my-app
```

_需要 npm 6+ 版本_

**yarn**

```sh
yarn create @mara my-app
```

_需要 yarn 0.25+ 版本_

**Marauder CLI**

```sh
npm i @mara/cli -g

mara create my-app
```

### 选择模板

Marauder 预设 Vue 及 React 模板，可通过 `--preset | -p` 参数指定。

默认情况下创建 Vue + Typescript 项目:

```
npx @mara/create my-app
```

创建 React + Typescript 项目:

```
npx @mara/create my-app --p react
```

#### Vanilla Js 模板

当 `--preset` 参数指定其他非预设值时，将应用 Vanilla Js 模板

使用 zepto:

```
npx @mara/create my-app --preset zepto --no-ts
```

不使用任何类库：

```
npx @mara/create my-app --preset --no-ts
```

完整的命令行参数有：

- `--use-npm` 使用 `npm` 安装依赖，默认 `yarn`
- `--use-pnp` 使用 yarn pnp 模式
- `--no-ts` 不使用 typescript
- `--preset | -p` 指定预设模板，vue | react | other lib
- `--force | -f` 强制在指定目录生成项目

### 项目结构

通过 marauder 创建的项目具有以下典型结构：

```bash
my-app
├── README.md
├── node_modules
├── package.json
├── marauder.config.js
├── .gitignore
└── src
    └── views  # 视图目录
        ├── home  # 页面
        │   ├── index.js
        │   └── index.html
        └── profile  # 页面
            ├── index.js
            └── index.html
```

#### 视图目录

marauder 为多页打包工具，我们约定 `src/views` 为**视图目录**，视图目录用于存放**页面**。

#### 页面

我们把视图目录下，含有**入口脚本**和**入口文档**文件的目录称为**页面**。
我们约定入口脚本与入口文档以 `index` 命名。

可识别为入口脚本的文件有：

- index.js
- index.ts
- index.jsx
- index.tsx

当同时存在多个入口脚本时，遵循以下加载顺序：

```
ts > tsx > js > jsx
```

入口文档：index.html

页面示例：

```bash
views
├── home  # home 页面
│   ├── index.js
│   └── index.html
└── profile  # profile 页面
│   ├── index.ts
│   └── index.html
└── other  # 非页面，缺少入口脚本
    ├── foo.js
    └── index.html
```

上述示例中 `home` 和 `profile` 目录含有入口脚本与入口文档，因此被识别为**页面**。
`other` 目录仅含有入口文档，缺少入口脚本，因此不是页面。

## Npm Scripts

### `npm run dev` or `yarn dev`

运行开发模式，在本地 3022 端口（默认）启动开发服务器

### `npm test` or `yarn test`

### `npm run build` or `yarn build`

运行生产模式打包资源，在 `dist` 目录下输出项目构建结果

## Roadmap

### 一期目标

- [x] **@mara/cli** 全新 CLI 工具
- [x] **@mara/create** 全新项目结构生成工具
- [x] **@mara/x** webpack-marauder2（基于 webpack4+）
- [x] 活用 Lerna 管理，模块化拆分
- [x] commit 风格约束，贡献指南
- [x] 支持微前端构建
- [x] 项目打包性能优化

### 二期目标

- [] ESLint 强约束
- [] 建全测试用例
- [] 完善文档网站
- [] 开发辅助脚本
- [] typescript 重构
- [] 设计器支援
