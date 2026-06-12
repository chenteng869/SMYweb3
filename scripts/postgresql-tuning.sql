-- =============================================
-- SMYWeb3 PostgreSQL 性能调优脚本
-- 适用环境: 生产环境 PostgreSQL 16+
-- 执行方式: psql -U admin -d smyweb3_prod -f postgresql-tuning.sql
--
-- 注意事项:
--   1. 本脚本仅创建索引和执行诊断查询，不修改 postgresql.conf
--   2. 连接池参数（pool_size、max_connections）需在 DATABASE_URL 或
--      Prisma schema 的 datasource 块中配置，或在 postgresql.conf 中设置
--   3. 索引创建操作在业务低峰期执行（如凌晨），避免锁表影响在线服务
-- =============================================

BEGIN;

-- ================================================================
-- 一、连接池参数建议（供参考，需在 postgresql.conf 中手动配置）
-- ================================================================
-- 推荐配置 (根据服务器内存调整):
--   pool_size = 25-50              -- 通常 = CPU 核心数 × 2
--   max_connections = 100-200       -- PG 最大并发连接数（含连接池）
--   statement_timeout = '30s'       -- 单条 SQL 最大执行时间（防慢查询拖垮数据库）
--   lock_timeout = '5s'            -- 等待行锁的最大时间（防死锁堆积）
--   idle_in_transaction_session_timeout = '10min'  -- 空闲事务超时自动回滚

-- Prisma connection string 示例:
--   DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=25&pool_timeout=10"

-- ================================================================
-- 二、查询计划缓存模式（PG12+ 默认开启）
-- ================================================================
-- plan_cache_mode = force_custom_plan  -- 对于参数化查询推荐使用自定义计划
-- 说明: 统计/聚合类查询通常数据分布不均，强制自定义计划可避免通用计划性能劣化


-- ================================================================
-- 三、关键索引创建（补充 Prisma ORM 未自动生成的复合/部分索引）
-- 目的: 优化 Phase 3 获客系统高频查询路径
-- ================================================================

-- --------------------------------------------------------
-- 3.1 Agent 任务表 — 高频查询优化
-- 场景: 获取某个 Session 下待处理/运行中的任务列表
-- --------------------------------------------------------

-- 部分索引: 仅索引 queued 和 running 状态的任务（活跃任务占比通常 < 20%）
CREATE INDEX IF NOT EXISTS idx_agent_task_session_status
ON agent_tasks(session_id, status)
WHERE status IN ('queued', 'running');

-- 复合索引: 按类型 + 状态 + 创建时间倒序（任务列表分页查询）
CREATE INDEX IF NOT EXISTS idx_agent_task_type_status_created
ON agent_tasks(type, status, created_at DESC);


-- --------------------------------------------------------
-- 3.2 LLM 调用日志表 — 统计聚合查询优化
-- 场景: 按供应商/模型统计调用次数、成功率、平均耗时
-- --------------------------------------------------------

-- 部分索引: 仅索引成功的调用记录（用于统计分析）
CREATE INDEX IF NOT EXISTS idx_llm_call_provider_model_created
ON llm_call_logs(provider, model, created_at DESC)
WHERE success = true;

-- 复合索引: 用户会话维度的调用历史查询（用户侧详情展示）
CREATE INDEX IF NOT EXISTS idx_llm_call_user_session
ON llm_call_logs(user_id, session_id, created_at DESC);


-- --------------------------------------------------------
-- 3.3 区块链存证表 — 存证状态与交易哈希查询
-- 场景: 根据文件 ID 查询存证记录、根据 tx_hash 查链上确认状态
-- --------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_evidence_file_did
ON blockchain_evidences(file_id, did_id);

CREATE INDEX IF NOT EXISTS idx_evidence_tx_hash
ON blockchain_evidences(tx_hash);


-- --------------------------------------------------------
-- 3.4 文件存储表 — 哈希去重核心索引
-- 场景: 上传前检查文件是否已存在（SHA-256 哈希唯一性校验）
-- --------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_storage_hash
ON file_storages(hash_sha256);


-- --------------------------------------------------------
-- 3.5 获客线索表 — 高价值线索快速筛选
-- 场景: 按平台筛选高分线索、按活动追踪转化效果
-- --------------------------------------------------------

-- 部分索引: 仅索引评分 > 50 的高质量线索
CREATE INDEX IF NOT EXISTS idx_lead_platform_score
ON acquisition_leads(platform_id, score DESC)
WHERE score > 50;

-- 复合索引: 活动-平台维度的时间线查询（效果分析看板）
CREATE INDEX IF NOT EXISTS idx_lead_campaign_platform
ON acquisition_leads(campaign_id, platform_id, updated_at DESC);


-- --------------------------------------------------------
-- 3.6 审计日志表 — 用户行为追溯
-- 场景: 按用户 + 操作类型 + 时间范围查询审计记录
-- --------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_audit_log_user_action_created
ON audit_logs(user_id, action, created_at DESC);

COMMIT;


-- ================================================================
-- 四、表空间分析诊断（辅助 VACUUM 决策）
-- 输出: 各表的行数、磁盘占用、死元组数量、顺序扫描 vs 索引扫描比例
-- 用途: 识别需要 VACUUM ANALYZE 或重新索引的大表
-- ================================================================

SELECT
    schemaname,
    tablename,
    n_live_tup AS row_count,                              -- 当前有效行数
    pg_size_pgid(relid) / 1024 / 1024 AS size_mb,         -- 表大小 (MB)
    pg_stat_get_dead_tuple(relid) AS dead_tuples,         -- 死元组数（需 VACUUM 回收）
    seq_scan,                                             -- 全表扫描次数（越高越需加索引）
    idx_scan                                              -- 索引扫描次数
FROM pg_stat_user_tables
ORDER BY pg_size_pgid(relid) DESC                         -- 按表大小降序
LIMIT 20;


-- ================================================================
-- 五、慢查询分析（可选，需先启用 pg_stat_statements 扩展）
-- 启用方法:
--   1. shared_preload_libraries = 'pg_stat_statements' (postgresql.conf)
--   2. 重启 PostgreSQL
--   3. CREATE EXTENSION pg_stat_statements;
-- ================================================================

-- 取消下方注释以启用慢查询 Top 20 分析
/*
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

SELECT
    query,                          -- SQL 语句（截断显示）
    calls,                          -- 执行总次数
    total_exec_time,                -- 总执行时间 (ms)
    mean_exec_time,                 -- 平均执行时间 (ms)
    rows                            -- 返回行总数
FROM pg_stat_statements
ORDER BY mean_exec_time DESC        -- 按平均耗时降序
LIMIT 20;
*/


-- ================================================================
-- 六、AutoVACuum 自动清理配置建议（写入 postgresql.conf）
-- 目的: 更积极地回收死元组，防止表膨胀导致查询性能下降
-- 适用场景: 写入频繁的获客线索、Agent 任务、LLM 日志等表
-- ================================================================
-- autovacuum_vacuum_scale_factor = 0.1     -- 死元组占比达 10% 时触发 VACUUM（默认 0.20）
-- autovacuum_analyze_scale_factor = 0.05   -- 数据变更 5% 时触发 ANALYZE 更新统计信息
-- autovacuum_vacuum_cost_delay = 10ms       -- 降低单次 vacuum 操作的成本延迟（默认 20ms，加快启动速度）

-- 单表级别覆盖示例（针对高频写入表）:
-- ALTER TABLE acquisition_leads SET (autovacuum_vacuum_scale_factor = 0.05);
-- ALTER TABLE llm_call_logs SET (autovacuum_vacuum_scale_factor = 0.05);
-- ALTER TABLE agent_tasks SET (autovacuum_vacuum_scale_factor = 0.05);
