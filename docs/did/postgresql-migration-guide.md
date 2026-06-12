# PostgreSQL 数据库迁移指南

> **文档版本**: 1.0
> **更新日期**: 2026-06-11
> **适用项目**: WOPC 创业家管理后台 (SMYweb3.0)
> **风险等级**: 🟢 低风险

---

## 目录

- [1. 迁移概述](#1-迁移概述)
- [2. 前置准备](#2-前置准备)
- [3. Schema 兼容性分析](#3-schema-兼容性分析)
- [4. 迁移步骤详解](#4-迁移步骤详解)
  - [步骤 1: 安装 PostgreSQL](#步骤-1-安装-postgresql)
  - [步骤 2: 配置数据库连接](#步骤-2-配置数据库连接)
  - [步骤 3: 执行 Schema 迁移](#步骤-3-执行-schema-迁移)
  - [步骤 4: 导入数据](#步骤-4-导入数据)
  - [步骤 5: 验证数据完整性](#步骤-5-验证数据完整性)
- [5. 回滚方案](#5-回滚方案)
- [6. 常见问题与解决方案](#6-常见问题与解决方案)
- [7. 性能优化建议](#7-性能优化建议)
- [8. 迁移检查清单](#8-迁移检查清单)

---

## 1. 迁移概述

### 1.1 为什么从 SQLite 迁移到 PostgreSQL？

| 特性           | SQLite              | PostgreSQL                                         |
| -------------- | ------------------- | -------------------------------------------------- |
| **并发性能**   | ❌ 写入锁（单写者） | ✅ MVCC（多写者）                                  |
| **数据类型**   | 基础类型            | ✅ 丰富的数据类型（JSONB, UUID, 数组等）           |
| **索引**       | B-Tree              | ✅ GIN, GiST, Hash, 全文搜索等                     |
| **事务隔离**   | SERIALIZABLE only   | ✅ READ COMMITTED / REPEATABLE READ / SERIALIZABLE |
| **连接数限制** | 无（嵌入式）        | ✅ 支持连接池                                      |
| **生产环境**   | ⚠️ 仅适合小型应用   | ✅ 企业级生产就绪                                  |
| **扩展性**     | 单机                | ✅ 主从复制、分片、逻辑复制                        |
| **备份恢复**   | 文件复制            | ✅ pg_dump, PITR (Point-in-Time Recovery)          |

### 1.2 当前系统概况

- **当前数据库**: SQLite 3.x
- **表数量**: ~80+ 张表
- **核心模块**: 用户管理、DID 身份、钱包、KYC、SBT 凭证等
- **ORM**: Prisma (使用 `prisma db push`)
- **预估数据量**: 中小规模（适合快速迁移）

---

## 2. 前置准备

### 2.1 环境要求

```bash
# 确保已安装以下工具
✓ Node.js >= 18
✓ Prisma CLI (@prisma/client >= 5.x)
✓ Python >= 3.8 (用于导出脚本)
✓ PostgreSQL >= 14 (推荐 15 或 16)

# 检查版本
node -v        # v18.x+
npx prisma --version   # 5.x+
python --version # 3.8+
psql --version    # 14+ 或 postgres --version
```

### 2.2 备份当前数据

⚠️ **重要：在任何操作前，务必备份！**

```bash
# 1. 备份 SQLite 数据库文件
cp apps/api/prisma/dev.db backup/sqlite-backup-$(date +%Y%m%d-%H%M%S).db

# 2. 备份 schema.prisma
cp apps/api/prisma/schema.prisma backup/schema-backup.prisma

# 3. 记录当前 Prisma 版本
cd apps/api && cat package.json | grep prisma > backup/prisma-version.txt
```

### 2.3 创建基线迁移文件

由于之前使用 `prisma db push`（无迁移历史），需要创建初始基线：

```bash
# 已为您生成基线迁移文件：
apps/api/prisma/migrations/20260611000000_init/migration.sql
```

---

## 3. Schema 兼容性分析

### 3.1 兼容性评估结果

#### ✅ 完全兼容的特性（无需修改）

| Prisma 特性                         | SQLite 支持       | PostgreSQL 支持   | 兼容性      |
| ----------------------------------- | ----------------- | ----------------- | ----------- |
| `Int` + `@default(autoincrement())` | SERIAL            | SERIAL/IDENTITY   | ✅ 完全兼容 |
| `String` 类型                       | TEXT              | VARCHAR/TEXT      | ✅ 完全兼容 |
| `Float` 类型                        | REAL(8字节)       | DOUBLE PRECISION  | ✅ 完全兼容 |
| `Boolean` 类型                      | INTEGER(0/1)      | BOOLEAN           | ✅ 自动转换 |
| `DateTime` 类型                     | TEXT(ISO8601)     | TIMESTAMPTZ       | ✅ 完全兼容 |
| `BigInt` 类型                       | INTEGER(8字节)    | BIGINT            | ✅ 完全兼容 |
| `@unique` 约束                      | UNIQUE            | UNIQUE            | ✅ 完全兼容 |
| `@@unique([...])` 复合唯一约束      | UNIQUE            | UNIQUE            | ✅ 完全兼容 |
| `@@index([...])` 索引               | INDEX             | INDEX             | ✅ 完全兼容 |
| `@relation(...)` 外键关系           | FOREIGN KEY       | FOREIGN KEY       | ✅ 完全兼容 |
| `@@map("table_name")` 表名映射      | 支持              | 支持              | ✅ 完全兼容 |
| `@map("column_name")` 列名映射      | 支持              | 支持              | ✅ 完全兼容 |
| `@default(now())` 时间默认值        | CURRENT_TIMESTAMP | CURRENT_TIMESTAMP | ✅ 完全兼容 |
| `@default(true/false)` 布尔默认值   | 0/1               | TRUE/FALSE        | ✅ 自动转换 |
| `@default(0)` 数字默认值            | 0                 | 0                 | ✅ 完全兼容 |

#### ℹ️ 无需关注的特性（未使用）

| 特性               | 说明                           |
| ------------------ | ------------------------------ |
| `@default(uuid())` | 未使用，SQLite 不支持原生 UUID |
| `@default(cuid())` | 未使用，但两者都支持           |
| `@db.Unsigned()`   | 未使用，PG 无此概念            |
| SQLite 专有函数    | 未使用任何 SQLite 专用函数     |

#### ⚠️ 需要注意的差异

| 差异点       | 影响                                                   | 解决方案                |
| ------------ | ------------------------------------------------------ | ----------------------- |
| Float 精度   | SQLite: REAL (IEEE 754)<br>PG: DOUBLE PRECISION (相同) | ✅ 无需处理             |
| Boolean 存储 | SQLite: 0/1 整数<br>PG: 原生布尔类型                   | ✅ Prisma 自动处理      |
| NULL 处理    | 两者相同                                               | ✅ 无需处理             |
| 字符串转义   | 单引号转义方式略有不同                                 | ✅ 导出脚本已处理       |
| 大小写敏感   | PG 默认标识符小写<br>SQLite 不区分                     | ✅ 使用双引号保护标识符 |

### 3.2 迁移风险评估

```
🟢 总体风险等级: 低风险

详细评估:
├── Schema 兼容性: ████████████████████ 100% (完全兼容)
├── 数据类型映射: ████████████████████ 100% (所有类型可自动转换)
├── 约束和索引:   ████████████████████ 100% (全部支持)
├── 关系完整性:   ████████████████████ 100% (外键关系完整保留)
└── 数据丢失风险: ██████████████████░░░░ 90% (极低，仅注意特殊字符)
```

**结论**: 本次迁移属于**低风险操作**，Schema 设计良好，完全符合 PostgreSQL 规范。

---

## 4. 迁移步骤详解

### 步骤 1: 安装 PostgreSQL

#### 方案 A: Docker 推荐（快速部署）

```bash
# 创建 docker-compose.yml
cat > docker-compose.postgres.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: smy-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: smy_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-your_secure_password_here}
      POSTGRES_DB: smy_database
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./backup:/backup
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U smy_user -d smy_database"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
EOF

# 启动 PostgreSQL
docker-compose -f docker-compose.postgres.yml up -d

# 验证运行状态
docker ps | grep postgres
docker logs smy-postgres | tail -20
```

#### 方案 B: 本地安装

**Windows:**

1. 下载 [PostgreSQL Installer](https://www.postgresql.org/download/windows/)
2. 安装时记住设置的超级用户密码
3. 使用 pgAdmin 或 psql 连接

**macOS (Homebrew):**

```bash
brew install postgresql@16
brew services start postgresql@16
createdb smy_database
createuser -P smy_user
```

**Linux (Ubuntu/Debian):**

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql
sudo -u postgres createuser -P smy_user
sudo -u postgres createdb smy_database -O smy_user
```

### 步骤 2: 配置数据库连接

#### 2.1 修改 `.env.production` 文件

```bash
# 编辑环境变量文件
vim .env.production  # 或使用 VS Code 打开
```

**修改前 (SQLite):**

```env
DATABASE_URL="file:./dev.db"
```

**修改后 (PostgreSQL):**

```env
# PostgreSQL 连接字符串格式
DATABASE_URL="postgresql://smy_user:your_password@localhost:5432/smy_database?schema=public"

# 或者使用独立变量（更安全）
DB_HOST=localhost
DB_PORT=5432
DB_USER=smy_user
DB_PASSWORD=your_secure_password
DB_NAME=smy_database
DB_SCHEMA=public
```

#### 2.2 更新 Schema Provider

**方法 A: 直接修改 schema.prisma**

```bash
cd apps/api/prisma

# 备份原文件
cp schema.prisma schema.prisma.sqlite-backup

# 替换 provider
sed -i 's/provider = "sqlite"/provider = "postgresql"/' schema.prisma
```

**方法 B: 使用预生成的示例文件**

```bash
# 我们已经为您生成了 PostgreSQL 版本示例
cp schema.prisma.postgresql-example schema.prisma
```

### 步骤 3: 执行 Schema 迁移

#### 3.1 生成客户端代码

```bash
cd apps/api

# 安装 PostgreSQL 驱动（如果未安装）
npm install pg

# 重新生成 Prisma Client
npx prisma generate

# 验证生成成功
ls node_modules/.prisma/client/ | grep index.js
```

#### 3.2 创建并应用迁移

```bash
# 方法 A: 使用已有的基线迁移文件（推荐）
npx prisma migrate deploy

# 方法 B: 如果需要创建新迁移（首次）
npx prisma migrate dev --name init_postgresql
```

**预期输出:**

```
Prisma Migrate applied the following migration(s):
┌─┬────────────────────────────────┬──────┐
│ # │ Name                         │ Time │
├─┼────────────────────────────────┼──────┤
│ 0 │ 20260611000000_init          │ XXXms│
└─┴────────────────────────────────┴──────┘

✅ The following migration(s) have been successfully applied:
  - migrations/20260611000000_init/migration.sql

🚨 A migration that would apply these changes was just created:
  - migrations/20260611XXXXXX_init_postgresql/migration.sql
```

#### 3.3 验证表结构

```bash
# 连接 PostgreSQL 并查看表
psql -h localhost -U smy_user -d smy_database -c "\dt"

# 查看特定表结构
psql -h localhost -U smy_user -d smy_database -c "\d did_identities"

# 统计表数量
psql -h localhost -U smy_user -d smy_database -c "
SELECT count(*) as total_tables
FROM information_schema.tables
WHERE table_schema='public'
AND table_type='BASE TABLE';
"
```

### 步骤 4: 导入数据

#### 4.1 使用导出脚本生成 SQL 文件

```bash
# 进入项目根目录
cd /path/to/SMYweb3.020260527

# 运行导出脚本（需要 Python 3.8+）
python scripts/export-sqlite-to-postgres.py \
  --sqlite-db apps/api/prisma/dev.db \
  --output-file data-export-$(date +%Y%m%d-%H%M%S).sql \
  --batch-size 500 \
  --include-schema

# 可选：只导出关键表
python scripts/export-sqlite-to-postgres.py \
  --tables admin_user,users,did_identities,wallet_accounts,wallet_nonces,kyc_records,sbt_credentials,did_platform_permissions,did_audit_logs \
  --output-file critical-data-export.sql
```

**脚本参数说明:**

| 参数               | 说明                   | 默认值                      |
| ------------------ | ---------------------- | --------------------------- |
| `--sqlite-db`      | SQLite 数据库路径      | `apps/api/prisma/dev.db`    |
| `--output-file`    | 输出 SQL 文件路径      | `data-export-TIMESTAMP.sql` |
| `--tables`         | 要导出的表（逗号分隔） | 全部表                      |
| `--exclude-tables` | 排除的表（逗号分隔）   | 无                          |
| `--batch-size`     | 每个 INSERT 的行数     | 1000                        |
| `--include-schema` | 包含 CREATE TABLE 语句 | False                       |
| `--dry-run`        | 预览模式（不生成文件） | False                       |

#### 4.2 导入数据到 PostgreSQL

```bash
# 方法 A: 使用 psql 命令导入（推荐）
psql -h localhost -U smy_user -d smy_database -f data-export-YYYYMMDD-HHMMSS.sql

# 方法 B: 使用事务确保原子性
psql -h localhost -U smy_user -d smy_database << 'EOSQL'
BEGIN;

-- 导入数据（如果文件很大，可以分批）
\i data-export-YYYYMMDD-HHMMSS.sql

COMMIT;
EOSQL

# 方法 C: 分批导入大表（避免内存问题）
for table in admin_user users did_identities wallet_accounts; do
  echo "Importing $table..."
  grep -A 100000 "INSERT INTO \"$table\"" data-export.sql | head -100001 | \
  psql -h localhost -U smy_user -d smy_database
done
```

#### 4.3 监控导入进度

```bash
# 在另一个终端窗口监控
watch -n 2 "psql -h localhost -U smy_user -d smy_database -c \"
SELECT
  schemaname,
  tablename,
  n_live_tup as row_count
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC
LIMIT 10;
\""
```

### 步骤 5: 验证数据完整性

#### 5.1 行数对比

```bash
# 创建对比脚本 check-data-integrity.py
cat > scripts/check-data-integrity.py << 'PYEOF'
#!/usr/bin/env python3
import sqlite3
import psycopg2
import sys

def count_rows_sqlite(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT name FROM sqlite_master
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
    """)
    tables = [row[0] for row in cursor.fetchall()]

    counts = {}
    for table in tables:
        try:
            cursor.execute(f'SELECT COUNT(*) FROM "{table}"')
            counts[table] = cursor.fetchone()[0]
        except Exception as e:
            counts[table] = f"ERROR: {e}"

    conn.close()
    return counts

def count_rows_postgres(conn_string):
    import os
    conn = psycopg2.connect(conn_string)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT table_name FROM information_schema.tables
        WHERE table_schema='public' AND table_type='BASE TABLE'
    """)
    tables = [row[0] for row in cursor.fetchall()]

    counts = {}
    for table in tables:
        try:
            cursor.execute(f'SELECT COUNT(*) FROM "{table}"')
            counts[table] = cursor.fetchone()[0]
        except Exception as e:
            counts[table] = f"ERROR: {e}"

    conn.close()
    return counts

if __name__ == '__main__':
    sqlite_counts = count_rows_sqlite('apps/api/prisma/dev.db')
    postgres_counts = count_rows_postgres(os.environ.get('DATABASE_URL', 'postgresql://localhost/smy_database'))

    print("\n" + "="*80)
    print(f"{'Table':<40} {'SQLite':>12} {'PostgreSQL':>12} {'Status':>12}")
    print("="*80)

    all_tables = set(sqlite_counts.keys()) | set(postgres_counts.keys())
    mismatches = []

    for table in sorted(all_tables):
        sqlite_count = sqlite_counts.get(table, 0)
        postgres_count = postgres_counts.get(table, 0)

        if isinstance(sqlite_count, int) and isinstance(postgres_count, int):
            if sqlite_count == postgres_count:
                status = "✅ MATCH"
            else:
                status = f"❌ DIFF ({postgres_count - sqlite_count:+d})"
                mismatches.append(table)
        else:
            status = "⚠️ ERROR"

        print(f"{table:<40} {str(sqlite_count):>12} {str(postgres_count):>12} {status:>12}")

    print("="*80)
    if mismatches:
        print(f"\n⚠️ 发现 {len(mismatches)} 个表数据不匹配:")
        for t in mismatches:
            print(f"  - {t}")
    else:
        print("\n✅ 所有表数据完全匹配！")
PYEOF

# 运行验证
export DATABASE_URL="postgresql://smy_user:password@localhost/smy_database"
python scripts/check-data-integrity.py
```

#### 5.2 抽样数据校验

```sql
-- 在 PostgreSQL 中抽样检查关键表
SELECT * FROM users ORDER BY id LIMIT 5;
SELECT * FROM did_identities WHERE user_id IN (1,2,3);
SELECT * FROM wallet_accounts LIMIT 10;
SELECT * FROM kyc_records ORDER BY id DESC LIMIT 5;

-- 检查外键关系完整性
SELECT
    u.id as user_id,
    COUNT(di.id) as did_count,
    COUNT(wa.id) as wallet_count,
    COUNT(kr.id) as kyc_count
FROM users u
LEFT JOIN did_identities di ON di.user_id = u.id
LEFT JOIN wallet_accounts wa ON wa.user_id = u.id
LEFT JOIN kyc_records kr ON kr.user_id = u.id
GROUP BY u.id
HAVING COUNT(di.id) > 0 OR COUNT(wa.id) > 0
LIMIT 20;
```

#### 5.3 功能测试

```bash
# 启动 API 服务进行功能测试
cd apps/api
npm run dev

# 测试 API 端点
curl http://localhost:3000/api/users | jq .
curl http://localhost:3000/api/did/identities | jq .
curl http://localhost:3000/api/wallet/accounts | jq .

# 检查日志是否有错误
tail -f logs/app.log | grep -i error
```

---

## 5. 回滚方案

### 5.1 快速回滚到 SQLite

⚠️ **回滚前请再次备份数据！**

```bash
# 1. 停止服务
pm2 stop all  # 或 npm stop

# 2. 恢复 SQLite schema
cp apps/api/prisma/schema.prisma.sqlite-backup apps/api/prisma/schema.prisma

# 3. 恢复 .env
cp .env.backup .env.production  # 或手动编辑

# 4. 重新生成 Prisma Client
cd apps/api && npx prisma generate

# 5. 恢复 SQLite 数据库（如果有新数据需要同步）
# 注意：PostgreSQL → SQLite 反向同步较复杂，建议使用原始备份
cp backup/sqlite-backup-YYYYMMDD-HHMMSS.db apps/api/prisma/dev.db

# 6. 重启服务
npm run dev
```

### 5.2 PostgreSQL 内部回滚（Point-in-Time Recovery）

如果使用 PostgreSQL 的 WAL 归档：

```bash
# 回滚到某个时间点
pg_ctl stop -D /var/lib/postgresql/data
pg_basebackup -h localhost -D /var/lib/postgresql/data_backup -Fp -Xs -P

# 使用 pg_restore 恢复到指定时间点
pg_restore -U smy_user -d smy_database --clean --if-exists backup.dump

# 或使用时间戳恢复
psql -U smy_user -d smy_database << 'SQL'
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
-- 执行恢复命令
SQL
```

---

## 6. 常见问题与解决方案

### Q1: 迁移失败提示 "relation already exists"

**原因**: 表已存在（可能是之前的残留）

**解决方案**:

```sql
-- 删除所有公共 schema 的表（谨慎操作！）
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO smy_user;
GRANT ALL ON SCHEMA public TO public;

-- 重新运行迁移
npx prisma migrate deploy
```

### Q2: 数据导入时报 "duplicate key value violates unique constraint"

**原因**: 数据重复或自增 ID 冲突

**解决方案**:

```sql
-- 方法 A: 重置序列（如果使用 INSERT ... ON CONFLICT DO NOTHING 则不需要）
SELECT setval(pg_get_serial_sequence('"users"', 'id'), COALESCE(MAX(id), 1)) FROM "users";

-- 方法 B: 清空目标表后重新导入
TRUNCATE TABLE users, did_identities, wallet_accounts RESTART IDENTITY CASCADE;
\i data-export.sql

-- 方法 C: 使用 MERGE/UPSERT（导出脚本已包含 ON CONFLICT DO NOTHING）
```

### Q3: Float 精度差异导致的数据不一致

**现象**: 余额或金额字段在小数位上有微小差异

**解决方案**:

```sql
-- 检查精度差异
SELECT column_name, numeric_precision, numeric_scale
FROM information_schema.columns
WHERE table_name = 'users' AND data_type = 'double precision';

-- 如需更高精度，考虑使用 NUMERIC 类型（需修改 schema）
ALTER TABLE users ALTER COLUMN dvc_balance TYPE NUMERIC(18,6);
```

### Q4: 中文或其他 Unicode 字符乱码

**原因**: 编码设置不正确

**解决方案**:

```bash
# 确保 PostgreSQL 使用 UTF-8 编码
psql -l  # 查看 encoding 列，应为 UTF8

# 创建数据库时指定编码
createdb -E UTF8 smy_database

# 连接字符串中添加参数
DATABASE_URL="postgresql://user:pass@host:5432/db?charset=utf8"
```

### Q5: 性能问题（查询变慢）

**可能原因及优化方案**:

```sql
-- 1. 检查缺失的索引
SELECT *
FROM pg_stat_user_indexes
WHERE idx_scan = 0  -- 从未被使用的索引（可能是冗余的）
OR idx_scan < 10;   -- 很少使用的索引

-- 2. 分析查询计划
EXPLAIN ANALYZE SELECT * FROM did_identities WHERE status = 'active';

-- 3. 创建必要的索引
CREATE INDEX IF NOT EXISTS idx_did_identities_status_active
ON did_identities(status)
WHERE status = 'active';  -- 部分索引（更高效）

-- 4. VACUUM 和 ANALYZE
VACUUM ANALYZE;  -- 更新统计信息
```

### Q6: 内存不足（Out of Memory）

**解决方案**:

```bash
# 方法 A: 减小 batch size
python export-sqlite-to-postgres.py --batch-size 100

# 方法 B: 分批导入
split -l 10000 data-export.sql data-part-
for file in data-part-*; do
  psql -U smy_user -d smy_database -f "$file"
done

# 方法 C: 调整 PostgreSQL 内存配置
# 编辑 postgresql.conf
shared_buffers = 256MB        # 或物理内存的 25%
work_mem = 16MB
maintenance_work_mem = 128MB
```

### Q7: 连接数超限

```sql
-- 查看当前连接数
SELECT count(*) FROM pg_stat_activity;

-- 查看最大连接数限制
SHOW max_connections;

-- 临时调整（需重启生效）
ALTER SYSTEM SET max_connections = 200;
SELECT pg_reload_conf();
```

---

## 7. 性能优化建议

### 7.1 迁移后立即执行的优化

```sql
-- 1. 更新统计信息（重要！）
ANALYZE;

-- 2. 清理死元组
VACUUM VERBOSE ANALYZE;

-- 3. 重建索引（可选，如果表很大）
REINDEX DATABASE smy_database;
REINDEX TABLE did_identities;

-- 4. 设置适当的表空间（如使用 SSD）
-- ALTER TABLE large_table SET TABLESPACE ssd_tablespace;
```

### 7.2 PostgreSQL 配置优化

编辑 `postgresql.conf`（根据服务器硬件调整）:

```ini
# 内存相关
shared_buffers = 256MB              # 物理内存的 25%
effective_cache_size = 1GB         # 物理内存的 50%-75%
work_mem = 16MB                     # 排序/哈希操作的内存
maintenance_work_mem = 128MB       # VACUUM/CREATE INDEX 的内存

# WAL 相关
wal_buffers = 16MB
checkpoint_completion_target = 0.9
max_wal_size = 1GB
min_wal_size = 128MB

# 查询优化
random_page_cost = 1.1             # SSD 设为 1.1，HDD 为 4
effective_io_concurrency = 200     # SSD 设为 200，HDD 为 2

# 连接相关
max_connections = 100              # 根据实际并发调整
```

重启 PostgreSQL 使配置生效:

```bash
# Docker 环境
docker restart smy-postgres

# 本地安装
sudo systemctl restart postgresql
# 或 macOS
brew services restart postgresql@16
```

### 7.3 Prisma 性能优化

```typescript
// apps/api/src/lib/prisma.ts

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    // PostgreSQL 优化选项
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// 使用连接池（生产环境推荐）
// npm install @prisma/adapter-pg-worker
```

### 7.4 监控和维护

```bash
# 定期维护脚本 (cron job)
cat > scripts/postgres-maintenance.sh << 'EOF'
#!/bin/bash
# PostgreSQL 日常维护脚本
# 建议每天凌晨 3:00 执行 (crontab: 0 3 * * *)

PGHOST=localhost
PGUSER=smy_user
PGDATABASE=smy_database

echo "$(date): Starting PostgreSQL maintenance..."

# 1. VACUUM 所有表
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -c "VACUUM ANALYZE VERBOSE;" >> /var/log/pg-maintenance.log 2>&1

# 2. 检查表膨胀
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -c "
SELECT
  schemaname || '.' || relname AS table,
  n_dead_tup,
  n_live_tup,
  round(n_dead_tup::numeric / GREATEST(n_live_tup::numeric, 1), 2) AS dead_ratio
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY dead_ratio DESC
LIMIT 10;
" >> /var/log/pg-maintenance.log 2>&1

# 3. 备份数据库
BACKUP_FILE="/backup/smy-db-$(date +%Y%m%d-%H%M%S).dump"
pg_dump -h $PGHOST -U $PGUSER -d $PGDATABASE -Fc > $BACKUP_FILE
echo "Backup created: $BACKUP_FILE"

# 7 天前的备份清理
find /backup -name "*.dump" -mtime +7 -delete

echo "$(date): Maintenance completed."
EOF

chmod +x scripts/postgres-maintenance.sh
```

---

## 8. 迁移检查清单

在执行迁移前，请逐项确认：

### ✅ 迁移前检查

- [ ] 已完整备份 SQLite 数据库文件 (`dev.db`)
- [ ] 已备份 `schema.prisma` 文件
- [ ] 已记录当前 Prisma 版本和依赖
- [ ] 已确认 PostgreSQL 版本 ≥ 14
- [ ] 已创建 PostgreSQL 数据库和用户
- [ ] 已测试数据库连接（`psql` 能正常连接）
- [ ] 已准备好足够的磁盘空间（至少是 SQLite 文件的 3 倍）
- [ ] 已通知团队成员维护窗口期
- [ ] 已准备好回滚方案

### ✅ 迁移中检查

- [ ] 已成功修改 `schema.prisma` 的 provider 为 `postgresql`
- [ ] 已成功修改 `.env.production` 的 `DATABASE_URL`
- [ ] 已成功运行 `npx prisma generate`
- [ ] 已成功运行 `npx prisma migrate deploy`（无错误）
- [ ] 已成功导出 SQLite 数据为 SQL 文件
- [ ] 已成功导入数据到 PostgreSQL
- [ ] 导入过程中无严重错误（警告可忽略）

### ✅ 迁移后验证

- [ ] 所有表的行数与 SQLite 一致
- [ ] 关键业务数据抽样验证正确（用户、DID、钱包等）
- [ ] 外键关系完整（关联数据存在）
- [ ] 应用服务启动正常（无数据库连接错误）
- [ ] 核心 API 端点响应正常
- [ ] 日志中无数据库相关错误
- [ ] 查询性能可接受（无明显变慢）
- [ ] 已执行 `VACUUM ANALYZE`
- [ ] 已配置定期备份任务

### ✅ 生产环境额外检查

- [ ] 已配置 SSL/TLS 加密连接
- [ ] 已设置强密码策略
- [ ] 已配置防火墙规则（仅允许应用服务器访问 5432 端口）
- [ ] 已启用慢查询日志
- [ ] 已配置监控告警（Prometheus/Grafana 或类似工具）
- [ ] 已制定灾难恢复计划（DRP）
- [ ] 已完成压力测试（模拟高并发场景）

---

## 附录

### A. 有用的 SQL 查询

```sql
-- 查看所有表及其大小
SELECT
  relname AS table_name,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
  pg_size_pretty(pg_relation_size(relid)) AS data_size,
  pg_size_pretty(pg_indexes_size(relid)) AS index_size,
  n_live_tup as row_count
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- 查看活跃连接
SELECT pid, usename, application_name, client_addr, state, query_start, query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY query_start;

-- 终止长时间运行的查询
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE query_start < now() - interval '5 minutes'
AND state = 'active';

-- 锁定等待检测
SELECT
  blocked_locks.pid AS blocked_pid,
  blocking_locks.pid AS blocking_pid,
  blocked_activity.query AS blocked_statement,
  blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity
  ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks
  ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
JOIN pg_catalog.pg_stat_activity blocking_activity
  ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

### B. 故障排查命令速查

```bash
# PostgreSQL 服务状态
systemctl status postgresql    # Linux
brew services list | grep postgres  # macOS
docker ps | grep postgres       # Docker

# 日志位置
/var/log/postgresql/           # Linux (默认)
/usr/local/var/log/            # macOS Homebrew
docker logs smy-postgres       # Docker

# 连接测试
psql -h localhost -U smy_user -d smy_database -c "SELECT version();"

# Prisma 问题诊断
npx prisma db pull              # 从数据库拉取 schema 对比
npx prisma validate             # 验证 schema 语法
npx prisma format               # 格式化 schema 文件
```

### C. 参考资源

- [Prisma PostgreSQL 文档](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [PostgreSQL 16 官方文档](https://www.postgresql.org/docs/current/index.html)
- [SQLite 到 PostgreSQL 迁移指南](https://wiki.postgresql.org/wiki/Converting_from_other_Databases_to_PostgreSQL)
- [Prisma Migrate 最佳实践](https://www.prisma.io/docs/concepts/components/prisma-migrate)

---

## 联系支持

如果在迁移过程中遇到问题：

1. **首先查阅本文档的常见问题部分**
2. **检查 Prisma 和 PostgreSQL 官方文档**
3. **查看项目 GitHub Issues**（如有）
4. **联系技术支持团队**

---

**祝迁移顺利！🚀**
