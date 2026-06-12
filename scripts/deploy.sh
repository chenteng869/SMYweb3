#!/bin/bash
# SMYWeb3 一键部署脚本 v1.0
# 流程: Docker构建→镜像推送→服务滚动更新→健康检查→回滚
set -euo pipefail

ENVIRONMENT="${1:-staging}"
REGISTRY="${REGISTRY:-ghcr.io}"
IMAGE_PREFIX="${IMAGE_PREFIX:-smyweb3}"
COMPOSE_FILE="docker-compose.${ENVIRONMENT}.yml"
ROLLBACK_THRESHOLD=30
MAX_RETRIES=5

COLOR_GREEN='\033[0;32m'
COLOR_RED='\033[0;31m'
COLOR_YELLOW='\033[1;33m'
COLOR_RESET='\033[0m'

log() { echo -e "$(date '+%H:%M:%S') [$1] $2"; }
success() { log "INFO" "${COLOR_GREEN}✅ $*${COLOR_RESET}"; }
warn() { log "WARN" "${COLOR_YELLOW}⚠️  $*${COLOR_RESET}"; }
error() { log "ERROR" "${COLOR_RED}❌ $*${COLOR_RESET}"; }

step_build() {
    success "步骤 1/6: 构建 Docker 镜像"
    docker build -t "${IMAGE_PREFIX}-api:latest" -f apps/api/Dockerfile .
    docker build -t "${IMAGE_PREFIX}-admin:latest" -f apps/admin-web/Dockerfile .
    success "镜像构建完成"
}

step_push() {
    success "步骤 2/6: 推送镜像到 ${REGISTRY}"
    local TAG="$(date +%Y%m%d-%H%M%S)"
    docker tag "${IMAGE_PREFIX}-api:latest" "${REGISTRY}/${IMAGE_PREFIX}-api:${ENVIRONMENT}-${TAG}"
    docker tag "${IMAGE_PREFIX}-admin:latest" "${REGISTRY}/${IMAGE_PREFIX}-admin:${ENVIRONMENT}-${TAG}"
    docker push "${REGISTRY}/${IMAGE_PREFIX}-api:${ENVIRONMENT}-latest"
    docker push "${REGISTRY}/${IMAGE_PREFIX}-admin:${ENVIRONMENT}-latest"
    success "推送完成 (版本: ${TAG})"
}

step_pull() {
    success "步骤 3/6: 拉取最新镜像"
    docker compose -f "$COMPOSE_FILE" pull 2>/dev/null || true
}

step_deploy() {
    success "步骤 4/6: 滚动更新"
    docker compose -f "$COMPOSE_FILE" up -d --no-deps api --force-recreate
    
    local retries=0
    while [ $retries -lt $MAX_RETRIES ]; do
        if curl -sf "http://localhost:3001/health" > /dev/null 2>&1; then
            success "API 健康通过 (${retries}s)"
            break
        fi
        retries=$((retries + 1))
        warn "等待API... ($retries/$MAX_RETRIES)"
        sleep 3
    done
    
    if [ $retries -ge $MAX_RETRIES ]; then
        error "API超时! 执行回滚..."
        step_rollback
        exit 1
    fi
    
    docker compose -f "$COMPOSE_FILE" up -d --no-deps admin-web --force-recreate
    sleep 5
    success "更新完成"
}

step_verify() {
    success "步骤 5/6: 健康验证"
    local ok=0
    local total=5
    
    curl -sf "http://localhost:3001/health" && { success "[1/5] API ✓"; ok=$((ok+1)); } || error "[1/5] API ✗"
    curl -sf "http://localhost:3000" && { success "[2/5] Admin ✓"; ok=$((ok+1)); } || error "[2/5] Admin ✗"
    docker exec smyweb3-redis redis-cli ping 2>/dev/null | grep -q PONG && { success "[3/5] Redis ✓"; ok=$((ok+1)); } || error "[3/5] Redis ✗"
    docker exec smyweb3-rabbitmq rabbitmqctl status 2>/dev/null | grep -q Uptime && { success "[4/5] RabbitMQ ✓"; ok=$((ok+1)); } || error "[4/5] RabbitMQ ✗"
    curl -sf "http://localhost:9000/minio/health/live" && { success "[5/5] MinIO ✓"; ok=$((ok+1)); } || error "[5/5] MinIO ✗"
    
    [ $ok -eq $total ] && { echo "🎉 全部通过 ($ok/$total)"; return 0; } || { warn "部分失败 ($ok/$total)"; return 1; }
}

step_rollback() {
    warn "执行回滚..."
    docker compose -f "$COMPOSE_FILE" rollback 2>/dev/null || \
    docker compose -f "$COMPOSE_FILE" up -d --no-deps api admin-web
    warn "回滚完成，请手动验证"
}

if [[ "${2:-}" == "--rollback" ]]; then step_rollback; exit 0; fi

echo "╔════════════════════════════╗"
echo "║ SMYWeb3 部署工具 v1.0       ║"
echo "║ 环境: ${ENVIRONMENT}              ║"
echo "║ 时间: $(date '+%Y-%m-%d %H:%M')     ║"
echo "╚════════════════════════════╝"

step_build && step_push && step_pull && step_deploy && step_verify
exit $?
