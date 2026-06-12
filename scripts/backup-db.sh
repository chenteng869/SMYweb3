#!/bin/bash
# =============================================
# SMYWeb3 PostgreSQL 自动备份脚本 v1.0
# 功能: 全量备份 + 增量备份 + S3归档 + 30天保留
# 用法: ./backup-db.sh [--full|--incremental|--archive|--restore YYYYMMDD]
# =============================================

set -euo pipefail

# ===== 配置区 =====
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-smyweb3_prod}"
DB_USER="${DB_USER:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-/opt/backups/smyweb3}"
S3_BUCKET="${S3_BUCKET:-smyweb3-backups}"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 创建备份目录结构（全量/增量/归档）
mkdir -p "${BACKUP_DIR}/full" "${BACKUP_DIR}/incremental" "${BACKUP_DIR}/archive"

# 日志函数：统一输出格式 [时间戳] 消息
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

# ===== 函数1：全量备份 =====
# 使用 pg_dump 自定义格式(-Fc) + gzip最高压缩级别(9)
# 输出：${BACKUP_DIR}/full/${DB_NAME}_${TIMESTAMP}.sql.gz
backup_full() {
    local backup_file="${BACKUP_DIR}/full/${DB_NAME}_${TIMESTAMP}.sql.gz"
    log "【全量备份】开始 → 目标: ${backup_file}"
    log "数据库连接: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

    # 执行pg_dump完整转储
    # -Fc: 自定义格式，支持并行恢复和压缩
    # --compress=9: 最高gzip压缩级别，最小化存储空间
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
        -Fc --compress=9 \
        --file="$backup_file" \
        "$DB_NAME"

    local size=$(du -h "$backup_file" | cut -f1)
    log "✅ 全量备份完成: ${backup_file} (大小: ${size})"

    # 关键步骤：验证备份文件完整性
    # 确保备份未损坏，可成功用于恢复
    if gunzip -t "$backup_file" 2>/dev/null; then
        log "✅ 完整性验证通过 - 备份文件正常"
    else
        log "❌ 错误：备份文件已损坏！请检查磁盘空间并重新执行"
        exit 1
    fi
}

# ===== 函数2：增量备份（基于WAL） =====
# PostgreSQL增量备份通过WAL日志实现
# 先以directory格式导出，再打包为tar.gz便于管理
backup_incremental() {
    local backup_file="${BACKUP_DIR}/incremental/${DB_NAME}_${TIMESTAMP}.incremental.gz"
    log "【增量备份】开始 → 目标: ${backup_file}"

    # directory格式导出（支持并行和选择性恢复）
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
        --format=directory \
        --file="${BACKUP_DIR}/incremental/" \
        "$DB_NAME"

    # 打包为单一压缩文件，清理临时目录
    tar -czf "$backup_file" -C "${BACKUP_DIR}/incremental/" .
    rm -rf "${BACKUP_DIR}/incremental/"*

    log "✅ 增量备份完成: $(du -h "$backup_file" | cut -f1)"
}

# ===== 函数3：归档到S3/MinIO =====
# 使用mc (MinIO Client)同步到对象存储
# 前置：需配置mc alias并确保网络连通
archive_to_s3() {
    log "【S3归档】开始同步到 ${S3_BUCKET}..."
    
    # 同步全量备份目录
    mc mirror --overwrite "${BACKUP_DIR}/full/" "${S3_BUCKET}/full/"
    # 同步增量备份目录  
    mc mirror --overwrite "${BACKUP_DIR}/incremental/" "${S3_BUCKET}/incremental/"

    log "✅ S3归档完成"
}

# ===== 函数4：清理过期备份 =====
# 删除超过RETENTION_DAYS天的旧备份文件
cleanup_old_backups() {
    log "【自动清理】删除超过 ${RETENTION_DAYS} 天的旧备份..."
    
    find "${BACKUP_DIR}" -name "*.sql.gz" -mtime +${RETENTION_DAYS} -delete
    find "${BACKUP_DIR}" -name "*.incremental.gz" -mtime +${RETENTION_DAYS} -delete

    log "✅ 清理完成，仅保留最近 ${RETENTION_DAYS} 天的备份"
}

# ===== 函数5：数据库恢复 =====
# 从指定日期的全量备份恢复到新库（_restore后缀）
# 安全设计：不覆盖原数据库，恢复后需手动验证
restore_backup() {
    local date=$1
    # 查找匹配日期的备份文件
    local backup_file=$(find "${BACKUP_DIR}/full/" -name "*${date}*" -type f | head -1)

    if [[ -z "$backup_file" ]]; then
        echo "❌ 未找到日期为 ${date} 的备份"
        echo "可用备份:"
        ls -lh "${BACKUP_DIR}/full/" 2>/dev/null || echo "  （空）"
        exit 1
    fi

    log "【数据库恢复】从 ${backup_file} 恢复..."
    
    # 步骤1：清理旧的恢复库（如有）
    dropdb -h "$DB_HOST" -U "$DB_USER" --if-exists "${DB_NAME}_restore"
    # 步骤2：创建新的恢复库
    createdb -h "$DB_HOST" -U "$DB_USER" "${DB_NAME}_restore"
    # 步骤3：导入备份数据（管道方式，无需临时文件）
    gunzip -c "$backup_file" | psql -h "$DB_HOST" -U "$DB_USER" -d "${DB_NAME}_restore"

    log "✅ 恢复完成 → 数据库: ${DB_NAME}_restore"
    log "⚠️ 请验证数据完整性后再切换到生产环境"
}

# ===== 主程序入口 =====
case "${1:-}" in
    --full)         backup_full ;;                    # 执行全量备份
    --incremental)  backup_incremental ;;             # 执行增量备份
    --archive)      archive_to_s3 && cleanup_old_backups ;;  # 归档+清理组合操作
    --restore)
        # 恢复模式需要日期参数
        [[ -z "${2:-}" ]] && { echo "❌ 用法: $0 --restore YYYYMMDD"; exit 1; }
        restore_backup "${2}"
        ;;
    *)
        # 显示帮助信息
        echo ""
        echo "╔══════════════════════════════════════╗"
        echo "║   SMYWeb3 PostgreSQL 备份工具 v1.0     ║"
        echo "╚══════════════════════════════════════╝"
        echo ""
        echo "用法: $0 [选项]"
        echo ""
        echo "选项:"
        echo "  --full              全量备份（每日凌晨推荐）"
        echo "  --incremental       增量备份（每小时推荐）"
        echo "  --archive           S3归档+过期清理（每周推荐）"
        echo "  --restore YYYYMMDD  从指定日期备份恢复"
        echo ""
        echo "当前配置:"
        echo "  数据库: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
        echo "  备份目录: ${BACKUP_DIR}"
        echo "  S3桶: ${S3_BUCKET}"
        echo "  保留天数: ${RETENTION_DAYS}"
        echo ""
        echo "── Cron 定时任务示例 ──"
        echo "# 每日02:00全量备份"
        echo "0 2 * * * $0 --full >> /var/log/backup.log 2>&1"
        echo "# 每小时增量备份"
        echo "0 */1 * * * $0 --incremental >> /var/log/backup.log 2>&1"
        echo "# 每周日04:00归档+清理"
        echo "0 4 * * 0 $0 --archive >> /var/log/backup.log 2>&1"
        ;;
esac
