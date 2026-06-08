# MSB-EXCHANGE Web3 生态管理系统

完整的 Web3 综合生态管理后台系统，包含公链、交易所、钱包、NFT、内容、电商等完整功能模块。  
本仓库采用 **Monorepo** 形式管理四个相互独立的应用。

> 📘 配套文档：[docs/](./docs/) · 🧪 测试指南：[TESTING_GUIDE.md](./TESTING_GUIDE.md)

---

## 📦 仓库结构

```
SMYweb3.020260527/
├── apps/                              # 源码（4 个子项目）
│   ├── api/                           # 后端 — NestJS 10 + Prisma 5 + PostgreSQL
│   ├── admin-web/                     # 管理后台（Vite + React 19 + shadcn）— 推荐版本
│   ├── admin-web-legacy/              # 管理后台（Next.js 14 + Ant Design 5）— 旧版本，并行保留
│   └── h5-app/                        # H5 移动端 — Vite + React 19 + shadcn
├── deploy/                            # 部署产物（git 忽略）
│   ├── api/
│   ├── admin-web/                     # = admin-web 构建后的静态产物
│   ├── admin-web-legacy/              # = admin-web-legacy 构建后的静态产物
│   └── h5-app/                        # = h5-app 构建后的静态产物
├── docs/                              # 项目文档
│   ├── architecture/                  # 架构/技术方案
│   ├── api/                           # API/数据接口
│   ├── product/                       # 产品/功能设计
│   └── guides/                        # 使用与开发指南
├── scripts/                           # 通用脚本（build-all / dev-all / clean）
├── .env.example                       # 根级环境变量模板
├── .gitignore                         # 完整忽略规则
├── package.json                       # 根 workspaces 配置
├── README.md                          # 本文件
└── TESTING_GUIDE.md                   # 测试专题指南
```

---

## 🚀 四个子项目一览

| 子项目 | 路径 | 技术栈 | 端口 | 说明 |
|---|---|---|---|---|
| **api** | [apps/api](./apps/api) | NestJS 10 + Prisma 5 + PostgreSQL | `3001` | 后端 API 服务 |
| **admin-web** | [apps/admin-web](./apps/admin-web) | Vite + React 19 + shadcn/ui | `5173` | 管理后台（新版） |
| **admin-web-legacy** | [apps/admin-web-legacy](./apps/admin-web-legacy) | Next.js 14 + Ant Design 5 | `3000` | 管理后台（Next.js 版，并行保留） |
| **h5-app** | [apps/h5-app](./apps/h5-app) | Vite + React 19 + shadcn/ui | `5174` | H5 移动端 |

> ⚠️ `admin-web` 和 `admin-web-legacy` 是**两套并存的管理后台实现**，根据团队演进择一迁移。

---

## 🛠️ 快速开始

### 环境要求

- Node.js 18+
- npm 9+（推荐使用 workspaces 模式）
- PostgreSQL 14+（仅 api 需要）

### 安装依赖（Monorepo 一次性安装全部子项目）

```bash
# 根目录安装，自动 link 子项目
npm install

# 或显式安装所有 workspaces
npm run install:all
```

### 启动开发服务

```bash
# 方式 A：单独启动某一个
npm run dev:api
npm run dev:admin
npm run dev:admin-legacy
npm run dev:h5

# 方式 B：并行启动全部 4 个
npm run dev:all
```

| 启动后访问 | URL |
|---|---|
| 管理后台（新） | http://localhost:5173 |
| 管理后台（旧） | http://localhost:3000 |
| H5 移动端 | http://localhost:5174 |
| 后端 API | http://localhost:3001 |
| Swagger 文档 | http://localhost:3001/api/docs |

### 构建生产产物

```bash
# 单独构建
npm run build:api
npm run build:admin
npm run build:admin-legacy
npm run build:h5

# 一键构建全部
npm run build:all
```

构建完成后：
- `apps/*/dist/` / `apps/*/.next/` 中是源码构建产物（不部署）
- `deploy/*/` 中是**部署用静态文件**（已通过 `scripts/build-all.js` 同步或手工拷贝）

### 清理

```bash
# 清理构建产物和 deploy/ 目录
npm run clean

# 深度清理（同时删 node_modules）
npm run clean -- --deep
npm run install:all   # 之后重新安装
```

---

## ⚙️ 环境变量

根目录提供统一模板：`.env.example`

```bash
cp .env.example .env
# 按需修改后，分发到各子项目:
#   - 后端读取 apps/api/.env
#   - 前端通过 VITE_*/NEXT_PUBLIC_* 前缀暴露给浏览器
```

子项目也可单独维护自己的 `.env.local`（已被根 .gitignore 排除）。

---

## 🧪 测试

```bash
# 后端单元测试
npm run test:api

# 后端 E2E
npm run test:e2e:api

# 前端 Lint
npm run lint:all
```

详细测试清单见 [TESTING_GUIDE.md](./TESTING_GUIDE.md)。

---

## 📖 文档索引

| 类别 | 入口 |
|---|---|
| 系统架构设计 | [docs/architecture/](./docs/architecture/) |
| API / 数据接口 | [docs/api/](./docs/api/) |
| 产品 / 功能设计 | [docs/product/](./docs/product/) |
| 使用与开发指南 | [docs/guides/](./docs/guides/) |
| 脚本工具说明 | [scripts/README.md](./scripts/README.md) |

### 精选文档

- [管理后台架构设计](./docs/architecture/admin-dashboard-architecture.md)
- [Web3 生态系统整体架构](./docs/architecture/web3-ecosystem-architecture.md)
- [MSB EXCHANGE × Web3 生态整合方案](./docs/architecture/MSB-EXCHANGE-Web3-ecosystem-integration.md)
- [管理后台完整使用与开发指南](./docs/guides/admin-dashboard-complete-guide.md)
- [Web3.0 功能扩展设计](./docs/product/web3-feature-extension-design.md)

---

## 🧩 添加新应用

在 `apps/` 下新建子目录并初始化 `package.json`（`name` 字段需唯一）即可被根 `workspaces` 自动接管。

```bash
mkdir apps/my-new-app
cd apps/my-new-app
npm init -y
# ... 开发
```

---

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

---

## 📄 许可证

MIT — 查看 [LICENSE](./LICENSE) 文件了解详情

---

## 📞 联系方式

- 项目官网：https://msb-exchange.example.com
- 技术支持：support@msb-exchange.example.com
