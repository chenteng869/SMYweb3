# scripts/

通用脚本集合。

| 脚本 | 命令 | 作用 |
|---|---|---|
| [build-all.js](./build-all.js) | `npm run build:all` | 顺序构建全部 4 个子项目 |
| [dev-all.js](./dev-all.js) | `npm run dev:all` | 并行启动全部 4 个开发服务 |
| [clean.js](./clean.js) | `npm run clean` | 清理所有构建产物和 deploy/ 目录 |

## 用法

```bash
# 清理构建产物（不删依赖）
npm run clean

# 深度清理（包括 node_modules，需要重新 npm install:all）
npm run clean -- --deep

# 顺序构建所有子项目
npm run build:all

# 并行启动所有开发服务
npm run dev:all
```
