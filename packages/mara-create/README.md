# @mara/create

用于生成项目模板

## 命令

```bash
npx @mara my-app
```

```bash
npm init @mara my-app
```

## 流程

- 创建或检查应用目录
- 生成预置 package.json，添加依赖字段
- 安装 @mara/x 及 App 框架依赖
- 从 @mara/x 中提取项目模板
- 更新 package.json 余项字段
- 生成项目 src 目录及配置文件
- (如果不存在)初始化 git 仓库
