# @mara/create

用于生成项目模板

## 命令

```bash
npx @mara/create my-app
```

```bash
npm init @mara my-app
```

### 参数

- `--use-npm` 使用 `npm` 安装依赖，默认 `yarn`
- `--use-pnp` 使用 yarn pnp 模式
- `--no-ts` 不使用 typescript
- `--preset | -p` 指定预设模板，vue | react | other lib
- `--force | -f` 强制在指定目录生成项目

## 流程

- 创建或检查应用目录
- 生成预置 package.json，添加依赖字段
- 安装 @mara/x 及 App 框架依赖
- 从 @mara/x 中提取项目模板
- 更新 package.json 余项字段
- 生成项目 src 目录及配置文件
- (如果不存在)初始化 git 仓库
