# 14 · DLC 等级（DVC 积分 · 会员等级 · 权益）

> **对应 H5**：`/dlc-level`（DLC 等级页）
> **核心目标**：管理 DLC 等级体系（5 档）、DVC 积分规则、权益配置、用户等级查询。

---

## 1. 业务目标

- 5 档 DLC 等级规则配置
- 等级升降规则（按 DVC）
- 权益配置（每个等级的特权）
- 升级/降级通知
- 用户 DVC 流水（参见 [05-profile.md §6.3](./05-profile.md)）

## 2. 用户故事

| # | 故事 |
|---|---|
| US-1 | 作为运营，我设置「DLC 5 = DVC ≥ 10000」 |
| US-2 | 作为运营，我为 DLC 5 配置权益（专属客服、免税额度） |
| US-3 | 作为超管，我手动给某用户调整到 DLC 5 |
| US-4 | 作为客服，我查某用户的 DVC 流水 |

## 3. 字段定义

### 3.1 DlcLevel（DLC 等级配置）
| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| id | String | ✓ | |
| level | Int | ✓ | 1-5 |
| name | String(60) | ✓ | 等级名称（铜/银/金/铂金/钻石） |
| minDvc | Int | ✓ | 最低 DVC |
| maxDvc | Int | | 最高 DVC（null = 无上限） |
| iconUrl | String | | 等级图标 |
| color | String | | 主题色（#C0A36E 铜色） |
| benefits | String | | JSON 权益列表 |
| privileges | String | | JSON 功能特权 |
| upgradeBonus | Decimal | | 升级奖励 DVC |
| description | String | | 描述 |
| createdAt, updatedAt, deletedAt, version | | | 通用 |

### 3.2 DlcPrivilege（DLC 特权）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | String | |
| code | String | 唯一编码 |
| name | String | |
| description | String | |
| type | enum | `service` / `discount` / `exclusive` / `support` / `feature` |
| config | String | JSON 配置 |
| enabled | Boolean | |
| createdAt, updatedAt, deletedAt | | |

### 3.3 DlcUpgradeLog（升级日志）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | String | |
| userId | String | |
| fromLevel | Int | |
| toLevel | Int | |
| dvcAtTime | Int | 当前 DVC |
| reason | String | `auto`（自动）/ `manual`（手动） |
| operatorId | String | 手动时：adminUserId |
| createdAt | DateTime | |

## 4. 业务规则

### 4.1 等级判定
```
dvc < 100     → DLC 1（铜）
100 ≤ dvc < 500    → DLC 2（银）
500 ≤ dvc < 2000   → DLC 3（金）
2000 ≤ dvc < 10000 → DLC 4（铂金）
dvc ≥ 10000        → DLC 5（钻石）
```

> 注：阈值由 `DlcLevel.minDvc` 配置，可调整。

### 4.2 升级时机
- DVC 流水写入后**实时**判定
- 升级：旧等级权益收回，新等级权益发放
- 升级奖励 DVC 立即入账，写入 `DvcTransaction.type=reward`
- 推送通知
- 不可跳级（必须顺序升级）—— **但运营调整阈值会导致跳级，见 §4.4**

### 4.3 降级
- DLC 等级**只升不降**（保护用户）
- 除非超管手动

### 4.4 跳级与阈值变更（Q4 修复）

#### 场景
§4.2 写"不可跳级"，但 §6.1 允许运营 `PUT /api/admin/dlc/levels/:level` 修改 `minDvc` 阈值。**运营把 DLC 5 阈值从 10000 改到 5000，存量用户 dvc=6000 立刻从 DLC 4 跳到 DLC 5**——跳级不可避免。

#### 跳级升级规则（推荐方案）

> **逐级穿越 + 累计奖励**：运营改阈值或 DVC 流水触发跳级时，按"每穿越一个等级阈值都记录一次升级 + 累计奖励"。

#### 流程伪代码
```typescript
async function onDvcChange(userId: string, newDvc: number) {
  const oldLevel = await getUserLevel(userId);
  const newLevel = computeLevel(newDvc);

  if (newLevel > oldLevel) {
    // 跳级：for each level between oldLevel+1 and newLevel
    for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
      const cfg = await getDlcLevelConfig(lvl);

      // 1. 写升级日志
      await db.dlcUpgradeLog.create({
        data: {
          userId, fromLevel: lvl - 1, toLevel: lvl,
          dvcAtTime: newDvc,
          reason: 'auto',  // 或 'threshold_change'
        },
      });

      // 2. 写升级奖励流水（跳级则多条）
      if (cfg.upgradeBonus > 0) {
        await db.dvcTransaction.create({
          data: {
            userId, type: 'reward', amount: cfg.upgradeBonus,
            description: `升级 DLC ${lvl} 奖励`,
            balanceAfter: await getDvcBalance(userId) + cfg.upgradeBonus,
          },
        });
        await incrementDvcBalance(userId, cfg.upgradeBonus);
      }

      // 3. 发送通知
      await sendNotification(userId, 'dlc_upgrade', { level: lvl });
    }

    // 4. 更新最终等级
    await db.user.update({ where: { id: userId }, data: { userLevel: newLevel } });
  }
}
```

#### 例子
- 用户 dvc=0，dvc=6000 时阈值从 10000 改到 5000 → 一次性跳到 DLC 5
- 流水顺序：DLC 1→2 + bonus、DLC 2→3 + bonus、DLC 3→4 + bonus、DLC 4→5 + bonus
- `DlcUpgradeLog` 4 条
- `DvcTransaction(type=reward)` 4 条
- 用户最终 userLevel=5
- **不要**只奖一次"升到 5"——会少发前面 3 级的奖励

#### 阈值变更的额外处理
运营改阈值时，**只对未来生效**（DLC 5 阈值从 10000 → 5000，已升 DLC 5 的用户**不**降级）。**历史用户的等级不回算**（只升不降原则延伸）。

#### 运营操作审计
- `PUT /api/admin/dlc/levels/:level` 必须写 `AuditLog`，记录 oldMinDvc / newMinDvc
- 大额调整（> 50%）触发审批流（走 `dlc:levels:write` 权限）

#### 验收用例（跳级）
| # | 用例 | 期望 |
|---|---|---|
| 1 | DLC 5 阈值 10000 → 5000 | 用户 dvc=6000 自动升 DLC 5，4 条升级日志，4 条奖励流水 |
| 2 | 用户 dvc=10500，dvc 流水 +0（不触发） | 不升（已是 DLC 5） |
| 3 | 用户 dvc=50，dvc 流水 +60（达 110） | 升 DLC 2，1 条升级日志 + 1 条奖励 |
| 4 | 运营阈值回调 5000 → 10000 | 已升 DLC 5 的用户**不降级** |
| 5 | 改阈值时审计 | AuditLog 记录 old/new minDvc |

### 4.5 紧急回滚 SOP（Q9 修复）

> **为什么需要这章**：§4.4 跳级规则虽定义了"逐级穿越 + 累计奖励"，但**没限定触发条件、没给运营误操作的紧急回滚方案**。本节是"事故应急手册"。

#### 4.5.1 跳级触发的两个边界

| 触发源 | 同步还是异步 | 节流策略 |
|---|---|---|
| **DVC 流水**（用户完成任务/消费） | **同步**（在 `DvcTransaction` 写入时一并触发） | 同用户 1 分钟内多次升级 **合并 1 条 push**（按 §4.4 通知节流） |
| **运营改阈值**（`PUT /api/admin/dlc/levels/:level`） | **异步 job**（Cron 5 秒后批量重算） | 阈值变更后**延迟 30 秒**统一触发，避免大量用户并发升级打爆 DB |

```typescript
// 异步批量重算（运营改阈值后调用）
async function batchRecomputeLevelByThreshold() {
  // 1. 找出所有"dvc 跨过新旧阈值边界"的用户
  const affectedUsers = await db.user.findMany({
    where: { dvcBalance: { gte: oldMinDvc, lt: newMinDvc } }  // 例：DLC 5 旧 10000 → 新 5000，找 5000≤dvc<10000
  });
  // 2. 分批处理（每批 100 人）
  for (const batch of chunk(affectedUsers, 100)) {
    await Promise.all(batch.map(u => onDvcChange(u.id, u.dvcBalance)));
  }
  // 3. 通知节流：按 userId 去重，仅发 1 条 push（带"你已升级到 DLC X"摘要）
  await sendBatchNotifications(affectedUsers.map(u => ({
    userId: u.id, type: 'DLC_BATCH_UPGRADE', payload: { newLevel: u.userLevel }
  })));
}
```

#### 4.5.2 紧急回滚 SOP（误调阈值）

**场景**：运营误操作把 DLC 5 阈值从 10000 改到 5000，100 个用户瞬间跳到 DLC 5（已发奖励 DVC 总额 = `4 × 升级奖励 × 100 = 400× 升级奖励`）。

**步骤 1：立即**（< 5 分钟）撤回阈值
- 运营把 DLC 5 阈值改回 10000
- 系统**不**自动降级已升 DLC 5 的用户（§4.3 只升不降）
- 但**暂停**下一次定时 job（避免更多人跨过）

**步骤 2：识别被错误升级的用户**（cron 自动）
```typescript
async function findAccidentalUpgrades() {
  // 找出"当前 DLC 等级 > 实际 dvc 应得等级"的用户
  const levels = await db.dlcLevel.findMany({ orderBy: { minDvc: 'asc' } });
  const suspicious = await db.user.findMany({
    where: {
      OR: levels.map(l => ({
        dvcBalance: { lt: l.minDvc },
        userLevel: { gte: l.level },
      }))
    }
  });
  return suspicious;  // 管理员人工审核
}
```

**步骤 3：人工审核**（运营超管，**不可**自动回滚）
- 列出被误升级用户 + 应扣回 DVC 金额
- 运营按用户审核：
  - **方案 A：回滚 DVC**（扣回错发的奖励，写 `DvcTransaction(type=rollback)`，reason=运营工单号）
  - **方案 B：保留升级**（用户已享受权益，事后补偿沟通）
  - **方案 C：手动降级**（极端情况，违反§4.3 但走 `dlc:levels:write` 特批）

**步骤 4：回滚 DVC 操作**（必须有二次确认）
```typescript
async function rollbackUserUpgrade(userId: string, operatorId: string, reason: string) {
  // 1. 写 DlcUpgradeLog(toLevel=fromLevel)，标记"强制降级"
  await db.dlcUpgradeLog.create({
    data: { userId, fromLevel: u.userLevel, toLevel: targetLevel, dvcAtTime: u.dvcBalance, reason: `ROLLBACK:${reason}`, operatorId }
  });
  // 2. 扣回错发的 DVC 奖励
  for (const reward of wrongRewards) {
    await db.dvcTransaction.create({
      data: { userId, type: 'rollback', amount: -reward.amount, reason: `运营回滚:${reason}`, operatorId }
    });
  }
  // 3. 更新 userLevel
  await db.user.update({ where: { id: userId }, data: { userLevel: targetLevel } });
  // 4. 发通知（"你的 DLC 等级已调整，详情联系客服"）
}
```

**关键约束**：
- **回滚操作不可逆**——一旦回滚，无法自动恢复
- 每次回滚写 `AuditLog(action=DLC_ROLLBACK, severity=critical)`，触发 Slack 告警
- 超管 7 天内只能回滚 1 次（防滥用）

#### 4.5.3 验收用例（紧急回滚）

| # | 用例 | 期望 |
|---|---|---|
| 1 | 阈值 10000 → 5000 触发 100 人跳级 | 100 条 DlcUpgradeLog + 400 条 DvcTransaction(reward) |
| 2 | 1 分钟后运营撤回阈值到 10000 | 不降级用户（仅升不降），但停止新跳级 |
| 3 | 运营选择"回滚 DVC"处理用户 A | 写 rollback 流水 + 强制降级 + 通知 |
| 4 | DVC 流水触发跳级 | 同步触发，但 1 分钟内合并 push |
| 5 | 运营阈值变更 | 30 秒延迟后批量重算，不阻塞阈值修改 API |
| 6 | 强制降级 | 走 `dlc:levels:write` 权限，审计写 severity=critical |

---

## 5. Prisma 模型

```prisma
model DlcLevel {
  id            String   @id @default(uuid())
  level         Int      @unique
  name          String
  minDvc        Int
  maxDvc        Int?
  iconUrl       String?
  color         String?
  benefits      String?  // JSON
  privileges    String?  // JSON
  upgradeBonus  Decimal  @default(0)
  description   String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  deletedAt     DateTime?
  version       Int      @default(0)
}

model DlcPrivilege {
  id          String   @id @default(uuid())
  code        String   @unique
  name        String
  description String?
  type        String
  config      String?  // JSON
  enabled     Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?
}

model DlcUpgradeLog {
  id         String   @id @default(uuid())
  userId     String
  fromLevel  Int
  toLevel    Int
  dvcAtTime  Int
  reason     String
  operatorId String?
  createdAt  DateTime @default(now())

  @@index([userId, createdAt])
}
```

## 6. API 接口

### 6.1 等级配置
| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/admin/dlc/levels` | `dlc:levels:read` | 列表 |
| GET | `/api/admin/dlc/levels/:level` | | 详情 |
| PUT | `/api/admin/dlc/levels/:level` | `dlc:levels:write` | 编辑（阈值/权益/特权） |
| POST | `/api/admin/dlc/levels/reorder` | `dlc:levels:write` | 排序（一般不变） |

### 6.2 特权管理
| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/admin/dlc/privileges` | `dlc:levels:read` | 列表 |
| POST | `/api/admin/dlc/privileges` | `dlc:levels:write` | 新增 |
| PUT | `/api/admin/dlc/privileges/:id` | `dlc:levels:write` | 编辑 |
| DELETE | `/api/admin/dlc/privileges/:id` | `dlc:levels:write` | 删除 |

### 6.3 用户调整
| Method | Path | 权限 | 说明 |
|---|---|---|---|
| GET | `/api/admin/dlc/users/:userId/level` | `dlc:levels:read` | 查询用户等级 |
| GET | `/api/admin/dlc/users/:userId/upgrade-logs` | `dlc:levels:read` | 升级日志 |
| POST | `/api/admin/dlc/users/:userId/level` | `dlc:dvc:adjust` | 手动调整等级（reason 必填） |
| POST | `/api/admin/dlc/users/recalculate` | `dlc:dvc:adjust` | 重算等级（批量） |

### 6.4 H5 端
| Method | Path | 说明 |
|---|---|---|
| GET | `/api/h5/dlc/levels` | 5 档等级 |
| GET | `/api/h5/dlc/me` | 我的等级 + 进度 |
| GET | `/api/h5/dlc/me/benefits` | 我的权益 |
| GET | `/api/h5/dlc/me/upgrade-logs` | 升级日志 |

## 7. UI 组件

### 7.1 等级配置
- 5 个等级卡片：图标 / 名称 / 阈值范围 / 权益数
- 行操作：编辑
- 编辑器：阈值 / 颜色 / 图标 / 权益列表（拖拽）

### 7.2 特权管理
- 列表：编码 / 名称 / 类型 / 启用
- 编辑器：类型 / 配置

### 7.3 用户等级
- 用户搜索
- 等级展示卡片（与 H5 一致）
- 升级日志时间线
- 调整按钮（弹窗 + reason）

### 7.4 重算工具
- 批量重算（全量用户）
- 异步任务，进度条

## 8. 权限

| 操作 | operator | finance | superadmin |
|---|---|---|---|
| 查看 | ✓ | ✓ | ✓ |
| 编辑等级 | ✗ | ✗ | ✓ |
| 调整用户等级 | ✗ | ✗ | ✓ |
| 批量重算 | ✗ | ✗ | ✓ |

## 9. i18n

```json
{
  "dlc": {
    "title": "DLC 等级",
    "level": {
      "levelBronze": "铜",
      "levelSilver": "银",
      "levelGold": "金",
      "levelPlatinum": "铂金",
      "levelDiamond": "钻石"
    },
    "privilegeType": {
      "service": "专属服务",
      "discount": "折扣优惠",
      "exclusive": "专享功能",
      "support": "优先支持",
      "feature": "特权功能"
    }
  }
}
```

## 10. 验收用例

| # | 用例 | 期望 |
|---|---|---|
| 1 | 编辑 DLC 5 阈值 10000 → 8000 | H5 端 dvc≥8000 用户升级 |
| 2 | DLC 5 升级奖励 500 DVC | 升级后 DVC 流水 +500 |
| 3 | 用户 DVC 从 950 → 1050 | 自动升级 DLC 4 |
| 4 | 用户 DVC 跌至 100 以下 | 等级不变（只升不降） |
| 5 | 超管手动降级 DLC 5 → DLC 3 | 写升级日志（reason 倒序） |
| 6 | DLC 5 权益：专属客服 | H5 DLC 5 用户显示客服入口 |
| 7 | DLC 3 权益：免费税务咨询 | H5 端税务页显示「免费」 |
| 8 | 批量重算 10000 用户 | 异步任务，5min 内完成 |
| 9 | 升级通知推送 | H5 端收到 push |
| 10 | 5 档配置不可少于 5 档 | 删除 DLC 5 失败 |
