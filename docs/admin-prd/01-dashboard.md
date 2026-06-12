# 01 · 仪表盘（Dashboard）

> **对应 H5**：`/`（首页）
> **核心目标**：后台首页 = 运营总览。1 屏看清「今日关键指标 + 待办 + 订单流 + 活动」。

---

## 1. 业务目标

- 一屏看全：用户、订单、支付、合规的核心 KPI
- 待办优先：所有「待我处理」的任务统一展示，按紧急度排序
- 实时性：关键数字 5 分钟内刷新
- 入口聚合：高频操作 1 步可达

## 2. 用户故事

| #    | 故事                                                           |
| ---- | -------------------------------------------------------------- |
| US-1 | 作为运营，我希望首页就看到「今日新用户、今日 GMV、待审订单」   |
| US-2 | 作为客服，我希望看到「待我处理的 KYC / 订单」按紧急度排序      |
| US-3 | 作为超管，我希望首页有「系统健康指标」（API 错误率、队列堆积） |
| US-4 | 作为审计，我希望首页有「24h 异常操作」速览                     |

## 3. 数据来源（沿用 H5）

- `AdminKpi`：`{ label, value, change, changeType, prefix, suffix }`（`h5-app/src/types/index.ts`）
- `AdminOrder`：`{ id, type, customer, customerId, status, amount, currency, createdAt, updatedAt, assignedTo, notes }`
- `Notification`：`{ id, title, message, type, read, timestamp, actionUrl }`

## 4. 字段定义（dashboard 视图模型）

| 字段                                                  | 类型           | 说明                                         |
| ----------------------------------------------------- | -------------- | -------------------------------------------- |
| **KPI 区（4 卡片）**                                  |                |                                              |
| 今日新用户                                            | `Int`          | `User.createAt` 在今日 0 点后                |
| 今日 GMV                                              | `Decimal`      | 完成的 `Transaction.amount` 之和（USD 等值） |
| 待审订单                                              | `Int`          | `AdminOrder.status = 'new' or 'reviewing'`   |
| 活跃用户 DAU                                          | `Int`          | 24h 内 `User.lastActiveAt`                   |
| **待办区**                                            |                |                                              |
| `myTasks`                                             | `AdminOrder[]` | `assignedTo = me AND status != 'completed'`  |
| **最新订单区**                                        |                |                                              |
| `recentOrders`                                        | `AdminOrder[]` | 按 `createdAt desc` 取 10 条                 |
| **快捷操作**                                          |                |                                              |
| 审核新订单、查看用户反馈、AI 知识库更新、系统日志导出 | 链接           |                                              |
| **异常预警**                                          |                |                                              |
| 失败支付数、API 5xx、风控拦截                         | `Int`          |                                              |

## 5. 状态机

本模块无独立状态，依赖 `AdminOrder.status`：

```
new → processing → reviewing → completed
                                ↓
                            cancelled
```

## 6. Prisma 模型（无需新表，复用）

```prisma
// 复用：AdminUser, User, Transaction, AdminOrder, Notification
// 仪表盘无新增表
```

## 7. API 接口

| Method | Path                                     | 权限         | 说明                           |
| ------ | ---------------------------------------- | ------------ | ------------------------------ |
| GET    | `/api/admin/dashboard/stats`             | 全部         | 4 个 KPI（今日 / 本周 / 同比） |
| GET    | `/api/admin/dashboard/my-tasks`          | 全部         | 我的待办（按优先级 + 紧急度）  |
| GET    | `/api/admin/dashboard/recent-orders`     | 全部         | 最新 10 条订单                 |
| GET    | `/api/admin/dashboard/recent-activities` | 全部         | 全站最新 10 条操作活动         |
| GET    | `/api/admin/dashboard/chart-data`        | 全部         | 7 天订单/用户/GMV 折线         |
| GET    | `/api/admin/dashboard/notifications`     | 全部         | 顶部红点（未读通知数 + 列表）  |
| GET    | `/api/admin/dashboard/health`            | `superadmin` | API 错误率、队列长度           |
| GET    | `/api/admin/dashboard/anomaly-alerts`    | `superadmin` | 24h 异常（>10 笔失败支付等）   |

### 7.1 响应示例

```json
{
  "success": true,
  "data": {
    "kpis": [
      { "label": "今日新用户", "value": 128, "change": 12.5, "changeType": "up" },
      { "label": "今日 GMV", "value": 84520, "prefix": "$", "change": -3.2, "changeType": "down" },
      { "label": "待审订单", "value": 23, "change": 0, "changeType": "neutral" },
      { "label": "DAU", "value": 3210, "change": 8.7, "changeType": "up" }
    ],
    "myTasks": [...],
    "recentOrders": [...],
    "recentActivities": [...],
    "chartData": {
      "orders": [{ "date": "06-01", "value": 23 }, ...],
      "users":  [...],
      "gmv":    [...]
    }
  }
}
```

## 8. UI 组件

### 8.1 KPI 卡片

- 标题 + 数值 + 同比变化（带 ↑/↓ 图标）
- 数值 > 阈值变红
- 点击下钻

### 8.2 待办列表

- 紧凑卡片：标题 / 客户 / 金额 / 紧急度色标
- 最多 5 条 + 「查看全部」

### 8.3 最新订单

- 表格：客户 / 类型 / 金额 / 状态徽章
- 点击 → 详情

### 8.4 折线图

- 7 天趋势（recharts `LineChart`）
- 切换 tab：订单 / 用户 / GMV

### 8.5 异常预警（超管可见）

- 红底卡片：异常项 + 数值 + 跳转链接

## 9. 权限

| 角色       | 可见数据范围                          |
| ---------- | ------------------------------------- |
| 超级管理员 | 全部                                  |
| 运营       | 全部 KPI，但隐藏「健康指标」          |
| 客服       | 全部 KPI，但只看自己的待办            |
| 财务       | 全部 KPI + 财务专属指标（应收、坏账） |
| 风控       | 全部 KPI + 风控拦截数                 |
| 审计       | 全部 KPI（只读）                      |

## 10. i18n

字典 key 示例：

```json
{
  "dashboard": {
    "title": "仪表盘",
    "kpi": {
      "newUsersToday": "今日新用户",
      "gmvToday": "今日 GMV",
      "pendingOrders": "待审订单",
      "dau": "DAU"
    },
    "myTasks": "我的待办",
    "recentOrders": "最新订单",
    "shortcuts": {
      "auditOrders": "审核新订单",
      "viewFeedback": "查看用户反馈",
      "updateKnowledge": "AI 知识库更新",
      "exportLogs": "系统日志导出"
    }
  }
}
```

## 11. 验收用例

| #   | 用例                            | 期望                                  |
| --- | ------------------------------- | ------------------------------------- |
| 1   | 客服登录 → 仪表盘               | 看到 4 个 KPI + 仅自己的待办          |
| 2   | 数字 5 分钟内自动刷新           | 数值变化或顶部「刚刚」                |
| 3   | 点击「待审订单」卡片            | 跳到 `/companies?status=new`          |
| 4   | 7 天图表切换 tab                | 折线平滑切换                          |
| 5   | 待办为空                        | 显示空态插画 + 「去处理」按钮         |
| 6   | 超管 vs 运营 看到的「健康指标」 | 超管可见，运营不可见                  |
| 7   | 移动端打开                      | 4 KPI 单列堆叠，待办/订单/图表单列    |
| 8   | 数据加载失败                    | 各区块单独 toast 报错，不影响其他区块 |
