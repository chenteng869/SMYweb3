# SMYWeb3 AI 自动化系统 — 运维操作手册

> **文档版本**: v2.0.0
> **适用环境**: 生产环境 (Production) / 预发布环境 (Staging)
> **最后更新**: 2026-06-11
> **维护团队**: SMYWeb3 DevOps

---

## 目录

1. [系统架构概览](#1-系统架构概览)
2. [环境准备](#2-环境准备)
3. [日常运维操作](#3-日常运维操作)
4. [故障排查指南](#4-故障排查指南)
5. [备份与恢复](#5-备份与恢复)
6. [监控告警响应](#6-监控告警响应)
7. [发布流程](#7-发布流程)
8. [附录: 常用命令速查](#8-附录)

---

## 1. 系统架构概览

### 1.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户接入层 (CDN/LB)                        │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTPS : 443 / HTTP : 80
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Nginx 反向代理集群                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                       │
│  │ Nginx-01 │  │ Nginx-02 │  │ Nginx-03 │  (Keepalived HA)     │
│  └──────────┘  └──────────┘  └──────────┘                       │
└──────┬──────────────┬──────────────┬─────────────────────────────┘
       │              │              │
       ▼              ▼              ▼
┌────────────┐ ┌────────────┐ ┌────────────┐
│ Admin Web  │ │   API      │ │ WebSocket  │
│  (Vue3)    │ │(ThinkPHP8) │ │  Gateway   │
│  :3000     │ │  :3001     │ │  :3002     │
└────────────┘ └─────┬──────┘ └────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
┌───────────┐ ┌───────────┐ ┌───────────┐
│ PostgreSQL │ │   Redis   │ │ RabbitMQ  │
│   :5432    │ │  :6379    │ │  :5672    │
└───────────┘ └───────────┘ └───────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
┌───────────┐ ┌───────────┐ ┌───────────┐
│   MinIO   │ │   n8n     │ │ OpenClaw  │
│  Object   │ │ Workflow  │ │  Agents   │
│  Storage  │ │ Engine    │ │           │
│  :9000    │ │  :5678    │ │  :8080    │
└───────────┘ └───────────┘ └───────────┘
```

### 1.2 核心组件说明

| 组件       | 技术栈                   | 端口 | 用途                  | 资源建议   |
| ---------- | ------------------------ | ---- | --------------------- | ---------- |
| Admin Web  | Vue3 + Vite + TypeScript | 3000 | 管理后台前端          | 2核4G      |
| API Server | PHP 8.0 + ThinkPHP 8.0   | 3001 | RESTful API服务       | 4核8G      |
| PostgreSQL | PostgreSQL 14+           | 5432 | 主数据库              | 8核32G SSD |
| Redis      | Redis 7.x                | 6379 | 缓存/会话/队列        | 4核16G     |
| RabbitMQ   | Erlang/OTP               | 5672 | 消息队列中间件        | 4核8G      |
| MinIO      | Go (S3兼容)              | 9000 | 对象存储（文件/备份） | 4核16G SSD |
| n8n        | Node.js                  | 5678 | 工作流自动化引擎      | 2核4G      |
| OpenClaw   | Python/FastAPI           | 8080 | AI智能体平台          | 8核32G GPU |

### 1.3 网络拓扑与安全域

```
【互联网】
    │
    ▼
┌─────────────┐
│  WAF防火墙   │ ← DDoS防护 / SQL注入防护 / XSS过滤
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   负载均衡   │ ← Nginx + SSL终结
└──────┬──────┘
       │
  ┌────┴────┐
  ▼         ▼
【DMZ区】  【内网区】
 Web服务器  数据库/缓存/消息队列
 (公网IP)   (内网IP, 仅内网访问)
```

**安全策略要点:**

- 数据库、Redis、RabbitMQ 仅监听内网地址 (127.0.0.1 / 10.x.x.x)
- 所有对外服务强制 HTTPS (Let's Encrypt 自动续签)
- API 接口采用 JWT Bearer Token 认证
- 敏感配置通过环境变量或密钥管理服务注入，禁止硬编码

---

## 2. 环境准备

### 2.1 基础设施要求

#### 最低硬件配置（开发/测试环境）

| 资源     | 最低要求         | 推荐配置         |
| -------- | ---------------- | ---------------- |
| CPU      | 8核心            | 16核心           |
| 内存     | 32GB             | 64GB             |
| 系统盘   | 100GB SSD        | 200GB NVMe SSD   |
| 数据盘   | 500GB SSD        | 1TB NVMe SSD     |
| 网络     | 10Mbps           | 100Mbps          |
| 操作系统 | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

#### 生产环境推荐配置

| 资源   | 配置                 |
| ------ | -------------------- |
| CPU    | 32核心+ (支持超线程) |
| 内存   | 128GB+               |
| 系统盘 | 500GB NVMe RAID1     |
| 数据盘 | 2TB NVMe RAID10      |
| 网络   | 1Gbps 专线           |
| 冗余   | 双机热备 + 异地灾备  |

### 2.2 软件依赖安装

#### Docker & Docker Compose 安装

```bash
# 安装Docker (Ubuntu 22.04)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 安装Docker Compose V2 (插件形式)
sudo apt-get update
sudo apt-get install -y docker-compose-plugin

# 验证安装
docker --version          # Docker version 24.x.x
docker compose version    # Docker Compose version v2.x.x
```

#### MinIO Client (mc) 安装 - 用于S3备份归档

```bash
# 下载并安装mc
curl -O https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x mc
sudo mv mc /usr/local/bin/

# 配置MinIO别名 (替换为实际地址和凭证)
mc alias set myminio http://localhost:9000 MINIO_ACCESS_KEY MINIO_SECRET_KEY

# 测试连接
mc admin info myminio
```

#### PostgreSQL 客户端工具安装

```bash
# 安装pg_dump等客户端工具
sudo apt-get install -y postgresql-client-common postgresql-client-14

# 验证连接 (需配置PGHOST/PGUSER等环境变量或使用.pgpass)
pg_dump --version
```

### 2.3 环境变量配置

创建 `.env.production` 文件：

```bash
# ===== 数据库配置 =====
DB_HOST=postgres-prod.internal
DB_PORT=5432
DB_NAME=smyweb3_prod
DB_USER=smyweb3_app
DB_PASSWORD=<从密钥管理服务获取>

# ===== Redis配置 =====
REDIS_HOST=redis-prod.internal
REDIS_PORT=6379
REDIS_PASSWORD=<从密钥管理服务获取>
REDIS_DB=0

# ===== RabbitMQ配置 =====
RABBITMQ_HOST=rabbitmq-prod.internal
RABBITMQ_PORT=5672
RABBITMQ_USER=smyweb3_app
RABBITMQ_PASS=<从密钥管理服务获取>
RABBITMQ_VHOST=/smyweb3

# ===== MinIO/S3配置 =====
MINIO_ENDPOINT=minio-prod.internal:9000
MINIO_ACCESS_KEY=<从密钥管理服务获取>
MINIO_SECRET_KEY=<从密钥管理服务获取>
MINIO_BUCKET_NAME=smyweb3-uploads
S3_BUCKET=smyweb3-backups

# ===== JWT配置 =====
JWT_SECRET=<强随机字符串,至少64字符>
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# ===== AI服务配置 =====
OPENAI_API_KEY=<从密钥管理服务获取>
OPENAI_BASE_URL=https://api.openai.com/v1
OPENCLAW_API_URL=http://openclaw.internal:8080

# ===== 应用配置 =====
APP_ENV=production
APP_DEBUG=false
APP_URL=https://admin.smyweb3.com
LOG_LEVEL=warning
```

### 2.4 Docker Compose 服务编排

`docker-compose.production.yml` 核心配置示例:

```yaml
version: '3.8'

services:
  api:
    image: ghcr.io/smyweb3/smyweb3-api:production-latest
    restart: always
    ports:
      - '127.0.0.1:3001:3000'
    environment:
      - DB_HOST=${DB_HOST}
      - REDIS_HOST=${REDIS_HOST}
    depends_on:
      - postgres
      - redis
      - rabbitmq
    healthcheck:
      test: ['CMD', 'curl', '-sf', 'http://localhost:3000/health']
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '4.0'
          memory: 8G

  admin-web:
    image: ghcr.io/smyweb3/smyweb3-admin:production-latest
    restart: always
    ports:
      - '127.0.0.1:3000:80'
    depends_on:
      - api

  postgres:
    image: postgres:14-alpine
    restart: always
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - '127.0.0.1:5432:5432'

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD} --maxmemory 4gb --maxmemory-policy allkeys-lru
    volumes:
      - redisdata:/data
    ports:
      - '127.0.0.1:6379:6379'

  rabbitmq:
    image: rabbitmq:3-management-alpine
    restart: always
    environment:
      RABBITMQ_DEFAULT_USER: ${RABBITMQ_USER}
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASS}
    ports:
      - '127.0.0.1:5672:5672'
      - '127.0.0.1:15672:15672'

  minio:
    image: minio/minio:latest
    restart: always
    command: server /data --console-address ":9001"
    volumes:
      - miniodata:/data
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
    ports:
      - '127.0.0.1:9000:9000'
      - '127.0.0.1:9001:9001'

volumes:
  pgdata:
  redisdata:
  rabbitmqdata:
  miniodata:
```

---

## 3. 日常运维操作

### 3.1 服务启停管理

#### 启动所有服务

```bash
# 使用Docker Compose启动（推荐）
docker compose -f docker-compose.production.yml up -d

# 查看启动状态
docker compose -f docker-compose.production.yml ps

# 查看实时日志
docker compose -f docker-compose.production.yml logs -f --tail=100
```

#### 停止服务

```bash
# 停止所有服务（保留数据）
docker compose -f docker-compose.production.yml down

# 停止并删除数据卷（⚠️ 会丢失数据，谨慎使用）
docker compose -f docker-compose.production.yml down -v

# 仅重启某个服务
docker compose -f docker-compose.production.yml restart api
```

#### 单独管理某个服务

```bash
# 只启动API服务及其依赖
docker compose -f docker-compose.production.yml up -d api

# 查看API服务日志（最后200行，实时跟踪）
docker compose -f docker-compose.production.yml logs -f --tail=200 api

# 进入API容器内部调试
docker compose -f docker-compose.production.yml exec api bash
```

### 3.2 日志管理与排查

#### 日志位置与格式

| 服务       | 日志路径                      | 日志驱动  | 保留策略  |
| ---------- | ----------------------------- | --------- | --------- |
| API        | stdout → Docker logs          | json-file | 100MB x 5 |
| Nginx      | /var/log/nginx/               | file      | 7天轮转   |
| PostgreSQL | /var/lib/postgresql/data/log/ | csvlog    | 30天      |
| RabbitMQ   | /var/log/rabbitmq/            | file      | 14天      |
| 应用自定义 | /var/log/smyweb3/             | file      | 30天      |

#### 常用日志查询命令

```bash
# ===== API服务日志 =====
# 实时跟踪API日志
docker compose -f docker-compose.production.yml logs -f api --since 1h

# 过滤错误日志
docker compose -f docker-compose.production.yml logs api 2>&1 | grep -i "error\|exception\|fatal"

# 按时间范围查询
docker compose -f docker-compose.production.yml logs api --since "2026-06-11T00:00:00" --until "2026-06-11T12:00:00"

# ===== Nginx访问日志分析 =====
# 统计今日请求量
awk '{print $4}' /var/log/nginx/access.log | cut -d: -f2 | sort | uniq -c | sort -rn | head

# 查找慢请求（耗时>5秒）
awk '$NF > 5 {print $0}' /var/log/nginx/access.log

# 统计HTTP状态码分布
awk '{print $9}' /var/log/nginx/access.log | sort | uniq -c | sort -rn

# ===== 数据库慢查询 =====
# 启用慢查询日志（需修改postgresql.conf）
# log_min_duration_statement = 1000  # 记录超过1秒的SQL

# 查看当前活跃连接
docker exec smyweb3-postgres psql -U smyweb3_app -d smyweb3_prod \
    -c "SELECT pid, usename, query, query_start, state FROM pg_stat_activity WHERE state != 'idle';"

# ===== Redis监控 =====
# 实时查看Redis命令
docker exec smyweb3-redis redis-cli MONITOR

# 查看内存使用情况
docker exec smyweb3-redis redis-cli INFO memory
```

### 3.3 性能监控命令

#### 系统资源监控

```bash
# ===== CPU/内存/磁盘综合监控 =====
# 实时资源占用（每2秒刷新）
watch -n 2 'docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"'

# 详细系统资源
top -b -n 1 | head -20
free -h
df -h

# ===== Docker容器资源限制检查 =====
# 查看各容器资源使用情况
docker stats --no-stream

# 检查是否有容器触发OOM
dmesg | grep -i "oom\|killed" | tail -10
```

#### 数据库性能监控

```bash
# ===== PostgreSQL性能指标 =====
# 连接数统计
docker exec smyweb3-postgres psql -U smyweb3_app -c "
SELECT state, count(*)
FROM pg_stat_activity
GROUP BY state
ORDER BY count(*) DESC;
"

# 表大小排行（Top 10大表）
docker exec smyweb3-postgres psql -U smyweb3_app -d smyweb3_prod -c "
SELECT relname AS table_name,
       pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
       pg_size_pretty(pg_relation_size(relid)) AS data_size,
       pg_size_pretty(pg_indexes_size(relid)) AS index_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 10;
"

# 长事务检测（运行超过5分钟的事务）
docker exec smyweb3-postgres psql -U smyweb3_app -c "
SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
ORDER BY duration DESC;
"
```

#### 缓存与队列监控

```bash
# ===== Redis健康检查 =====
docker exec smyweb3-redis redis-cli INFO server | grep -E "version|uptime"
docker exec smyweb3-redis redis-cli INFO memory | grep -E "used_memory_human|maxmemory_human"
docker exec smyweb3-redis redis-cli INFO clients | grep connected_clients

# 查看Key空间分布
docker exec smyweb3-redis redis-cli INFO keyspace

# ===== RabbitMQ监控 =====
# 队列消息积压情况
docker exec smyweb3-rabbitmq rabbitmqctl list_queues name messages messages_ready messages_unacknowledged

# 连接数统计
docker exec smyweb3-rabbitmq rabbitmqctl list_connections

# 消费者状态
docker exec smyweb3-rabbitmq rabbitmqctl list_consumers
```

### 3.4 定时任务维护

#### Cron任务列表

```bash
# 查看当前用户的Cron任务
crontab -l

# 编辑Cron任务
crontab -e

# 系统级Cron任务目录
ls -la /etc/cron.d/
cat /etc/cron.d/smyweb3-maintenance
```

#### 推荐的定时任务配置

```cron
# SMYWeb3 运维定时任务配置
# ========================================
# 文件路径: /etc/cron.d/smyweb3-maintenance
# 执行用户: root 或 dedicated service user

# ----- 数据库备份 -----
# 每天凌晨2点执行全量备份
0 2 * * * /opt/smyweb3/scripts/backup-db.sh --full >> /var/log/smyweb3/backup.log 2>&1

# 每小时执行增量备份
0 */1 * * * /opt/smyweb3/scripts/backup-db.sh --incremental >> /var/log/smyweb3/backup.log 2>&1

# 每周日凌晨4点归档到S3并清理过期备份
0 4 * * 0 /opt/smyweb3/scripts/backup-db.sh --archive >> /var/log/smyweb3/backup.log 2>&1

# ----- 日志轮转 -----
# 清理30天前的应用日志
0 3 * * * find /var/log/smyweb3/ -name "*.log" -mtime +30 -delete

# ----- 系统维护 -----
# 每周日凌晨清理Docker未使用的镜像和卷
0 5 * * 0 docker system prune -af --volumes >> /var/log/smyweb3/docker-prune.log 2>&1

# Redis持久化检查（每小时）
15 * * * * docker exec smyweb3-redis redis-cli BGSAVE >> /dev/null 2>&1

# ----- 监控自愈 -----
# 每5分钟检查API健康状态，异常自动重启
*/5 * * * * curl -sf http://localhost:3001/health || (echo "[$(date)] API不健康，执行重启" >> /var/log/smyweb3/autoheal.log && docker restart smyweb3-api-1)
```

### 3.5 证书与安全维护

#### SSL证书管理（Let's Encrypt）

```bash
# 使用Certbot自动申请和续签SSL证书
# 安装Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# 申请证书（首次）
sudo certbot --nginx -d admin.smyweb3.com -d api.smyweb3.com

# 手动续签测试
sudo certbot renew --dry-run

# 设置自动续签Cron（Let's Encrypt默认已配置systemd timer）
sudo systemctl status certbot.timer

# 强制续签（如遇问题）
sudo certbot renew --force-renewal

# 查看证书有效期
openssl x509 -in /etc/letsencrypt/live/admin.smyweb3.com/fullchain.pem -noout -dates
```

#### 安全加固检查项

```bash
# ===== 端口扫描检查 =====
# 扫描本机开放端口
ss -tlnp | grep -E ":(22|80|443|3000|3001|5432|6379|5672|9000)"

# 确认敏感端口仅监听内网
netstat -tlnp | grep "0.0.0.0:(5432\|6379\|5672)" && echo "⚠️ 警告：敏感端口暴露到公网！"

# ===== 文件权限检查 =====
# .env文件权限应为600
ls -la /opt/smyweb3/.env*

# 日志文件不应有写权限给其他用户
find /var/log/smyweb3/ -type f -perm /o+w

# ===== 密码策略检查 =====
# 数据库用户密码强度
docker exec smyweb3-postgres psql -U postgres -c "\du"

# Redis是否设置密码
docker exec smyweb3-redis redis-cli CONFIG get requirepass
```

---

## 4. 故障排查指南

### 4.1 常见故障快速诊断流程图

```
用户报告问题
     │
     ▼
┌─────────────┐
│ 服务是否可访问？│
└──┬────────┬─┘
   │Yes      │No
   ▼         ▼
检查响应内容  ┌────────────┐
(慢?错误?)   │ 网络层排查  │
   │         │ DNS/防火墙/LB│
   ▼         └──────┬─────┘
┌──────────┐        │
│ 应用层排查  │◄──────┘
│ 日志/状态  │
└────┬─────┘
     │
     ▼
┌──────────┐     ┌──────────┐
│ 数据库层  │◄──►│ 缓存/队列  │
│ 慢查询/连接│     │ Redis/RMQ │
└──────────┘     └──────────┘
```

### 4.2 服务不可访问（502/503/504）

**症状**: 访问 admin.smyweb3.com 返回 502 Bad Gateway 或超时

**排查步骤**:

```bash
# 步骤1: 检查Nginx状态
systemctl status nginx
tail -50 /var/log/nginx/error.log

# 步骤2: 检查后端服务是否运行
docker compose -f docker-compose.production.yml ps

# 步骤3: 直接测试后端API（绕过Nginx）
curl -v http://127.0.0.1:3001/health

# 步骤4: 如果API无响应，查看容器日志
docker compose -f docker-compose.production.yml logs --tail=100 api

# 步骤5: 检查资源是否耗尽
docker stats --no-stream | grep api
free -h
df -h /

# 常见原因与解决方案:
# - 容器崩溃 → docker restart <container_id>
# - 内存OOM → 调整容器内存限制或优化应用
# - 端口冲突 → lsof -i :3001 / netstat -tlnp | grep 3001
# - 数据库连接池耗尽 → 检查pg_stat_activity，考虑增加max_connections
```

### 4.3 数据库连接失败

**症状**: API日志报错 "could not connect to server" 或 "connection refused"

**排查步骤**:

```bash
# 步骤1: PostgreSQL进程检查
docker ps | grep postgres
docker exec smyweb3-postgres pg_isready

# 步骤2: 连接性测试
docker exec smyweb3-postgres psql -U smyweb3_app -d smyweb3_prod -c "SELECT 1;"

# 步骤3: 检查连接数是否达到上限
docker exec smyweb3-postgres psql -U postgres -c "SHOW max_connections;"
docker exec smyweb3-postgres psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# 步骤4: 检查磁盘空间（PostgreSQL在磁盘满时会拒绝写入）
df -h /var/lib/docker/volumes/

# 常见解决方案:
# - 连接数满: 清理空闲连接或调大max_connections
#   SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state='idle' AND query_start < NOW() - INTERVAL '30 minutes';
# - 磁盘满: 清理旧日志、备份文件，或扩容磁盘
# - PostgreSQL崩溃: 查看PG日志分析崩溃原因
```

### 4.4 Redis缓存异常

**症状**: 会话丢失、验证码失效频繁、接口响应变慢

**排查步骤**:

```bash
# 步骤1: Redis连通性测试
docker exec smyweb3-redis redis-cli PING  # 应返回PONG

# 步骤2: 内存使用率检查
docker exec smyweb3-redis redis-cli INFO memory | grep used_memory_human
docker exec smyweb3-redis redis-cli INFO memory | grep mem_fragmentation_ratio

# 步骤3: 检查是否触发内存淘汰策略
docker exec smyweb3-redis redis-cli CONFIG get maxmemory-policy
docker exec smyweb3-redis redis-cli INFO stats | grep evicted_keys

# 步骤4: 检查持久化状态（AOF/RDB）
docker exec smyweb3-redis redis-cli LASTSAVE
docker exec smyweb3-redis redis-cli BGREWRITEAOF

# 常见解决方案:
# - 内存不足: 调整maxmemory或清理无用key
#   SCAN 0 MATCH "temp:*" COUNT 1000 | xargs redis-cli DEL
# - 持久化失败: 检查磁盘空间和fsync性能
# - 主从同步断开: 检查网络和复制偏移量
```

### 4.5 RabbitMQ消息堆积

**症状**: 异步任务处理延迟、工作流执行卡住

**排查步骤**:

```bash
# 步骤1: 查看各队列积压情况
docker exec smyweb3-rabbitmq rabbitmqctl list_queues name messages messages_ready messages_unacknowledged

# 步骤2: 检查消费者状态
docker exec smyweb3-rabbitmq rabbitmqctl list_consumers queue_name pid channel prefetch_count ack_required

# 步骤3: RabbitMQ管理界面
# 浏览器打开 http://localhost:15672 (需端口映射)
# 查看Queues标签页的图表趋势

# 步骤4: 检查死信队列
docker exec smyweb3-rabbitmq rabbitmqctl list_queues name arguments | grep dead-letter

# 解决方案:
# - 消费者挂起: 重启消费者服务，检查消费逻辑是否有bug
# - 消息体过大: 调整消息大小限制或改用对象存储传递大文件
# - 队列容量满: 增加消费者数量或启用TTL自动过期
```

### 4.6 MinIO存储异常

**症状**: 文件上传失败、下载404、备份归档报错

**排查步骤**:

```bash
# 步骤1: MinIO健康检查
curl http://localhost:9000/minio/health/live
curl http://localhost:9000/minio/health/ready

# 步骤2: 检查磁盘空间
df -h /var/lib/docker/volumes/smyweb3_miniodata/

# 步骤3: mc客户端测试
mc ls myminio/smyweb3-uploads/
mc admin info myminio

# 步骤4: 检查桶策略和权限
mc anonymous get myminio/smyweb3-uploads/

# 解决方案:
# - 磁盘满: 清理旧文件或扩展存储卷
# - 权限错误: 重新配置IAM策略
# - 网络不通: 检查防火墙规则和DNS解析
```

---

## 5. 备份与恢复

### 5.1 备份策略总览

| 备份类型 | 频率      | 保留期 | 存储位置     | RTO目标 |
| -------- | --------- | ------ | ------------ | ------- |
| 全量备份 | 每日02:00 | 30天   | 本地 + S3    | ≤4小时  |
| 增量备份 | 每小时    | 7天    | 本地 + S3    | ≤30分钟 |
| WAL归档  | 实时      | 14天   | S3仅         | ≤5分钟  |
| 配置备份 | 每次变更  | 永久   | Git仓库 + S3 | 即时    |

### 5.2 执行备份操作

#### 手动全量备份

```bash
# 使用备份脚本执行全量备份
/opt/smyweb3/scripts/backup-db.sh --full

# 验证备份文件
ls -lh /opt/backups/smyweb3/full/
gunzip -t /opt/backups/smyweb3/full/smyweb3_prod_*.sql.gz && echo "✅ 备份完整"
```

#### 手动增量备份

```bash
/opt/smyweb3/scripts/backup-db.sh --incremental
ls -lh /opt/backups/smyweb3/incremental/
```

#### 归档到S3

```bash
/opt/smyweb3/scripts/backup-db.sh --archive
mc ls myminio/smyweb3-backups/full/
mc ls myminio/smyweb3-backups/incremental/
```

### 5.3 数据库恢复操作

#### 场景1：恢复到指定时间点

```bash
# 从2026年6月11日的备份恢复
/opt/smyweb3/scripts/backup-db.sh --restore 20260611

# 恢复后数据库名为 smyweb3_prod_restore
# 验证恢复结果
docker exec smyweb3-postgres psql -U smyweb3_app -d smyweb3_prod_restore -c "\dt" | head -20
docker exec smyweb3-postgres psql -U smyweb3_app -d smyweb3_prod_restore -c "SELECT count(*) FROM users;"
```

#### 场景2：切换恢复库到生产

```bash
# ⚠️ 危险操作！请先确认恢复库数据正确！

# 步骤1: 停止所有应用服务
docker compose -f docker-compose.production.yml down

# 步骤2: 重命名数据库
docker exec smyweb3-postgres psql -U postgres \
    -c "ALTER DATABASE smyweb3_prod RENAME TO smyweb3_prod_backup_$(date +%Y%m%d);"
docker exec smyweb3-postgres psql -U postgres \
    -c "ALTER DATABASE smyweb3_prod_restore RENAME TO smyweb3_prod;"

# 步骤3: 重启服务
docker compose -f docker-compose.production.yml up -d

# 步骤4: 验证
curl http://localhost:3001/health
```

### 5.4 其他组件备份

#### Redis数据备份

```bash
# 触发RDB快照
docker exec smyweb3-redis redis-cli BGSAVE

# 复制RDB文件
docker cp smyweb3-redis:/data/dump.rdb /opt/backups/smyweb3/redis/dump_$(date +%Y%m%d_%H%M%S).rdb

# AOF备份（如果启用了AOF持久化）
docker cp smyweb3-redis:/data/appendonly.aof /opt/backups/smyweb3/redis/aof_$(date +%Y%m%d_%H%M%S).aof
```

#### MinIO桶数据同步

```bash
# 将MinIO数据镜像到异地备份
mc mirror myminio/smyweb3-uploads/ backup-minio/smyweb3-updates-backup/ --watch

# 或者使用rclone同步到云存储
rclone sync /path/to/minio/data remote:backup-bucket/smyweb3/
```

---

## 6. 监控告警响应

### 6.1 监控体系架构

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│ Prometheus  │←→│ Grafana     │   │ AlertManager │
│ (指标采集)   │   │ (可视化)     │   │ (告警路由)   │
└──────┬──────┘   └──────┬──────┘   └──────┬──────┘
       │                │                │
       ▼                ▼                ▼
┌─────────────┐  ┌──────────┐  ┌──────┴──────┐
│ Node Exporter│  │ Dashboard│  │ 通知渠道:    │
│ cAdvisor    │  │ 面板     │  │ ·钉钉机器人  │
│ pg_exporter │  │          │  │ ·企业微信    │
│ redis_export│  │          │  │ ·邮件(SMTP)  │
│ rabbitmq_exp│  │          │  │ ·短信(紧急)  │
└─────────────┘  └──────────┘  └─────────────┘
```

### 6.2 关键告警指标与阈值

| 告警名称       | 指标                                           | 阈值                  | 严重级别 | 响应时间      |
| -------------- | ---------------------------------------------- | --------------------- | -------- | ------------- |
| API服务宕机    | up{job="api"} == 0                             | 0                     | 🔴 P0    | 立即(5分钟内) |
| API响应延迟    | http_request_duration_seconds > 3s             | >3s,持续2min          | 🟠 P1    | 15分钟        |
| 错误率飙升     | http_requests_total{status=~"5.."} / rate > 5% | >5%                   | 🟠 P1    | 15分钟        |
| CPU使用过高    | cpu_usage_percent                              | >85%,持续10min        | 🟡 P2    | 30分钟        |
| 内存使用过高   | memory_usage_percent                           | >90%                  | 🟡 P2    | 30分钟        |
| 磁盘空间不足   | disk_used_percent                              | >85%                  | 🟠 P1    | 15分钟        |
| 数据库连接数满 | pg_stat_activity count                         | >max_connections\*0.8 | 🔴 P0    | 立即          |
| Redis内存告警  | redis_memory_used_bytes                        | >maxmemory\*0.9       | 🟠 P1    | 15分钟        |

### 6.3 告警响应SOP（标准作业程序）

#### P0级告警（立即响应）

```
收到P0告警 → 1分钟内确认告警真实性 → 5分钟内初步定位 → 15分钟内修复或降级方案
                                                                    │
                                                    ┌───────────────┤
                                                    ▼               ▼
                                              可快速修复         需要升级处理
                                                    │               │
                                                    ▼               ▼
                                              执行修复           通知开发团队
                                              验证恢复           开启故障工单
                                              书写报告           每小时同步进度
```

**示例：API服务宕机**

```bash
# 1. 确认告警（1分钟内）
curl -sf http://localhost:3001/health || echo "确认: API确实不可用"

# 2. 快速检查（3分钟内）
docker ps | grep api                    # 容器状态
docker logs --tail=50 smyweb3-api-1     # 最近日志

# 3. 尝试重启（5分钟内）
docker restart smyweb3-api-1
sleep 10
curl -sf http://localhost:3001/health && echo "✅ 恢复成功"

# 4. 如果重启无效，检查依赖服务
docker exec smyweb3-postgres pg_isready
docker exec smyweb3-redis redis-cli ping

# 5. 通知相关人员（如无法自行解决）
# 发送到钉钉群/企业微信群，附上关键日志片段
```

#### P1/P2级告警（按优先级响应）

- **P1**: 15分钟内开始处理，1小时内解决或给出方案
- **P2**: 30分钟内开始处理，4小时内解决或排期
- **P3**: 下一个工作日处理

### 6.4 监控面板说明

#### Grafana主要Dashboard

| Dashboard ID | 名称                        | 用途           | 访问权限    |
| ------------ | --------------------------- | -------------- | ----------- |
| 193          | Docker & Container Overview | 容器资源监控   | All         |
| 9628         | PostgreSQL Database         | 数据库性能     | DBA+DevOps  |
| 763          | Redis Dashboard             | Redis监控      | DevOps      |
| 4229         | RabbitMQ Overview           | 消息队列       | DevOps      |
| 1860         | Node Exporter Full          | 服务器基础资源 | All         |
| 自定义       | SMYWeb3 Business            | 业务KPI指标    | Product+Ops |

---

## 7. 发布流程

### 7.1 发布环境与分支策略

```
main (生产)
  ↑ 合并（需PR审核）
  │
staging (预发布)
  ↑ 合并（自动化测试通过）
  │
develop (开发)
  ← feature/* 分支（功能开发）
```

### 7.2 标准发布流程（6步）

#### Step 1: 代码审查与合并

```bash
# 创建发布分支
git checkout main && git pull
git checkout -b release/v2.1.0

# 合并staging代码
git merge origin/staging

# 推送并创建PR
git push origin release/v2.1.0
# 在GitHub/GitLab上创建Pull Request，等待Code Review
```

#### Step 2: 构建与测试

```bash
# 使用部署脚本一键构建
./scripts/deploy.sh staging

# 或手动构建测试
docker build -t smyweb3-api:test -f apps/api/Dockerfile .
docker run --rm smyweb3-api:test npm test
```

#### Step 3: 预发布环境验证

```bash
# 部署到Staging环境
./scripts/deploy.sh staging

# 执行冒烟测试
curl -sf https://staging-admin.smyweb3.com/api/v1/health | jq .

# 功能验证清单（QA团队执行）
# [ ] 用户登录/登出
# [ ] DID身份注册
# [ ] 文件上传与存证
# [ ] 电子签名流程
# [ ] AI智能体基本交互
# [ ] 获客数据看板加载
```

#### Step 4: 生产部署

```bash
# ⚠️ 生产部署需要至少2人确认！

# 执行生产部署
./scripts/deploy.sh production

# 部署过程中观察日志
docker compose -f docker-compose.production.yml logs -f api
```

#### Step 5: 发布后验证

```bash
# 健康检查
./scripts/deploy.sh production  # 脚本内置5项健康验证

# 业务功能抽检
# - 登录生产后台
# - 执行一次完整业务流程
# - 检查核心数据正确性

# 性能基准对比
# 对比发布前后P95/P99响应时间
ab -n 1000 -c 100 https://admin.smyweb3.com/api/v1/health
```

#### Step 6: 发布公告与文档更新

```markdown
## 发布记录 v2.1.0 - 2026-06-11

### 新增功能

- DID身份支持ERC-721标准
- AI智能体支持多模型切换

### 优化改进

- API响应时间优化30%
- 数据库查询索引优化

### 已知问题

- （如有）

### 回滚方案

如遇严重问题，执行: ./scripts/deploy.sh production --rollback
```

### 7.3 回滚操作

```bash
# 一键回滚到上一版本
./scripts/deploy.sh production --rollback

# 如一键回滚失败，手动回滚
# 1. 查看可用镜像版本
docker images | grep smyweb3

# 2. 切换到上一版本镜像
docker tag ghcr.io/smyweb3/smyweb3-api:production-20260610-120000 smyweb3-api:rollback
docker compose -f docker-compose.production.yml up -d --no-deps api

# 3. 验证回滚成功
curl http://localhost:3001/health
```

### 7.4 灰度发布（可选）

对于重大版本变更，建议采用灰度发布策略：

```bash
# 方式1: 基于权重的灰度（Nginx upstream）
# 10%流量到新版本，90%保持旧版本
upstream api_backend {
    server 127.0.0.1:3001 weight=9;   # 旧版
    server 127.0.0.1:3002 weight=1;   # 新版
}

# 方式2: 基于用户特征的灰度（Header/Cookie）
# 通过Nginx map模块或网关层实现

# 灰度观察期通常24-48小时，无异常后全量发布
```

---

## 8. 附录: 常用命令速查

### 8.1 Docker运维命令速查

```bash
# ===== 容器管理 =====
docker ps -a                          # 所有容器（含已停止）
docker stats --no-stream              # 资源占用快照
docker top <container>                # 容器内进程
docker inspect <container>             # 容器详细信息
docker logs -f --tail=200 <container> # 实时日志

# ===== 镜像管理 =====
docker images                         # 本地镜像列表
docker image prune -a                 # 清理未使用的镜像
docker system df                      # 磁盘使用概况

# ===== 网络管理 =====
docker network ls                     # 网络列表
docker network inspect <network>      # 网络详情
docker exec <container> cat /etc/hosts  # 容器DNS解析

# ===== 卷管理 =====
docker volume ls                      # 数据卷列表
docker volume inspect <volume>        # 卷详情
docker system prune -volumes          # 清理未使用的卷（⚠️危险）
```

### 8.2 PostgreSQL速查

```bash
# ===== 连接管理 =====
psql -h localhost -U smyweb3_app -d smyweb3_prod  # 连接数据库
\c database_name                       # 切换数据库
\dt                                    # 列出所有表
\d table_name                          # 表结构
\du                                    # 列出所有用户

# ===== 常用SQL =====
-- 当前连接数
SELECT count(*) FROM pg_stat_activity;

-- 表大小
SELECT pg_size_pretty(pg_total_relation_size('table_name'));

-- 正在执行的查询
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity WHERE state = 'active';

-- 终止长时间运行的查询
SELECT pg_terminate_backend(pid) FROM pg_stat_activity
WHERE query_start < NOW() - INTERVAL '5 minutes';
```

### 8.3 Redis速查

```bash
redis-cli PING                        # 连通性测试
redis-cli INFO server                 # 服务器信息
redis-cli INFO memory                 # 内存信息
redis-cli INFO keyspace               # Key分布
redis-cli DBSIZE                      # Key总数
redis-cli KEYS "*" | wc -l            # Key计数（慎用生产环境）
redis-cli FLUSHDB                     # 清空当前库（⚠️危险）
redis-cli FLUSHALL                    # 清空所有库（⚠️极度危险）

# 常用数据类型操作
redis-cli GET key                     # 字符串读取
redis-cli SET key value               # 字符串写入
redis-cli HGETALL hash_key            # Hash全部字段
redis-cli LRANGE list_key 0 -1        # List全部元素
redis-cli SMEMBERS set_key            # Set全部成员
```

### 8.4 应急联系人与升级链路

| 角色       | 姓名          | 联系方式  | 职责范围           |
| ---------- | ------------- | --------- | ------------------ |
| 一线运维   | On-Call工程师 | 钉钉/电话 | 初步诊断、快速恢复 |
| 二线支持   | 高级DevOps    | 企业微信  | 复杂问题排查       |
| 后端负责人 | Tech Lead     | 电话/邮件 | 代码级问题修复     |
| DBA        | 数据库管理员  | 工单系统  | 数据库相关问题     |
| 安全团队   | Security      | 紧急通道  | 安全事件响应       |

**升级触发条件**:

- P0告警30分钟未解决 → 升级至二线
- P0告警1小时未解决 → 升级至Tech Lead
- 涉及数据安全/泄露 → 立即升级Security

---

> **文档结束**
>
> 最后校验时间: 2026-06-11  
> 下次评审日期: 2026-07-11  
> 问题反馈: devops@smyweb3.com
