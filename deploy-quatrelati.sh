#!/bin/bash
# =====================================================
# Deploy Script - Quatrelati ERP
# v2.2.0 - Deploy com purge Cloudflare automático
# =====================================================

set -e

# Configurações
DEPLOY_DIR="/var/www/vhosts/laticinioquatrelati.com.br/erp.laticinioquatrelati.com.br"
MAINTENANCE_FLAG="$DEPLOY_DIR/.maintenance"
BACKUP_DIR="$DEPLOY_DIR/backups"
LOG_DIR="$DEPLOY_DIR/logs"
LOG_FILE="$LOG_DIR/deploy-$(date '+%Y%m%d-%H%M%S').log"
COMPOSE_FILE="docker-compose.plesk.yml"
ENV_FILE=".env.prod"

# Cloudflare
CLOUDFLARE_ZONE_ID="be3ec7c3ee6f7307d252a6915955609c"
CLOUDFLARE_TOKEN="${CLOUDFLARE_TOKEN:-}"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variáveis de estado
PREVIOUS_COMMIT=""
BACKUP_FILE=""

# =====================================================
# Funções Utilitárias
# =====================================================

log() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo -e "$message"
    echo "$message" >> "$LOG_FILE"
}

log_success() { log "${GREEN}✓ $1${NC}"; }
log_error() { log "${RED}✗ $1${NC}"; }
log_warning() { log "${YELLOW}⚠ $1${NC}"; }
log_info() { log "${BLUE}→ $1${NC}"; }

# =====================================================
# Verificações Iniciais
# =====================================================

check_disk_space() {
    log_info "Verificando espaço em disco..."

    local available=$(df -BG "$DEPLOY_DIR" | awk 'NR==2 {print $4}' | tr -d 'G')
    local required=5  # 5GB mínimo

    if [ "$available" -lt "$required" ]; then
        log_error "Espaço insuficiente: ${available}GB disponível, ${required}GB necessário"
        return 1
    fi

    log_success "Espaço em disco OK: ${available}GB disponível"
}

check_docker() {
    log_info "Verificando Docker..."

    if ! docker info > /dev/null 2>&1; then
        log_error "Docker não está rodando"
        return 1
    fi

    log_success "Docker OK"
}

# =====================================================
# Backup
# =====================================================

create_backup() {
    log_info "Criando backup do banco de dados..."

    mkdir -p "$BACKUP_DIR"
    BACKUP_FILE="$BACKUP_DIR/backup-$(date '+%Y%m%d-%H%M%S').sql"

    if docker exec quatrelati-db pg_dump -U quatrelati quatrelati_pedidos > "$BACKUP_FILE" 2>/dev/null; then
        local size=$(du -h "$BACKUP_FILE" | cut -f1)
        log_success "Backup criado: $BACKUP_FILE ($size)"
    else
        log_warning "Não foi possível criar backup (container pode estar parado)"
        BACKUP_FILE=""
    fi
}

cleanup_old_backups() {
    log_info "Limpando backups antigos (mantendo últimos 7 dias)..."

    local count=$(find "$BACKUP_DIR" -name "backup-*.sql" -mtime +7 2>/dev/null | wc -l)
    find "$BACKUP_DIR" -name "backup-*.sql" -mtime +7 -delete 2>/dev/null || true

    if [ "$count" -gt 0 ]; then
        log_success "Removidos $count backups antigos"
    fi
}

# =====================================================
# Manutenção
# =====================================================

enable_maintenance() {
    log_info "Ativando modo manutenção..."
    touch "$MAINTENANCE_FLAG"
    sleep 1
    log_success "Modo manutenção ativado"
}

disable_maintenance() {
    log_info "Desativando modo manutenção..."
    rm -f "$MAINTENANCE_FLAG"
    log_success "Modo manutenção desativado"
}

# =====================================================
# Git
# =====================================================

save_current_commit() {
    PREVIOUS_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "")
    if [ -n "$PREVIOUS_COMMIT" ]; then
        log_info "Commit atual: ${PREVIOUS_COMMIT:0:8}"
    fi
}

update_code() {
    log_info "Atualizando código via Git..."

    git fetch origin
    git reset --hard origin/main

    local new_commit=$(git rev-parse HEAD)
    log_success "Código atualizado: ${new_commit:0:8}"

    # Mostrar commits novos
    if [ -n "$PREVIOUS_COMMIT" ] && [ "$PREVIOUS_COMMIT" != "$new_commit" ]; then
        log_info "Novos commits:"
        git log --oneline "${PREVIOUS_COMMIT}..HEAD" | head -10 | while read line; do
            echo "    $line" >> "$LOG_FILE"
            echo "    $line"
        done
    fi
}

rollback_code() {
    if [ -n "$PREVIOUS_COMMIT" ]; then
        log_warning "Executando rollback para commit: ${PREVIOUS_COMMIT:0:8}"
        git reset --hard "$PREVIOUS_COMMIT"
        return 0
    fi
    return 1
}

# =====================================================
# Docker
# =====================================================

build_containers() {
    log_info "Construindo containers Docker..."

    if docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build 2>&1 | tee -a "$LOG_FILE"; then
        log_success "Build concluído"
    else
        log_error "Build falhou"
        return 1
    fi
}

restart_containers() {
    log_info "Reiniciando containers..."

    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d 2>&1 | tee -a "$LOG_FILE"
    log_success "Containers reiniciados"
}

wait_for_healthy() {
    log_info "Aguardando serviços responderem..."

    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        # Verificar se API responde
        local api_ok=$(curl -sf http://localhost:3001/api/health 2>/dev/null | grep -c '"ok"' || echo "0")

        # Verificar se Frontend responde
        local frontend_ok=$(curl -sf -o /dev/null -w '%{http_code}' http://localhost:3000/ 2>/dev/null || echo "000")

        if [ "$api_ok" -gt 0 ] && [ "$frontend_ok" = "200" -o "$frontend_ok" = "307" ]; then
            log_success "Todos os serviços estão respondendo"
            return 0
        fi

        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done

    echo ""
    log_error "Timeout aguardando serviços responderem"
    return 1
}

cleanup_docker() {
    log_info "Limpando imagens Docker não utilizadas..."

    local before=$(docker images -q | wc -l)
    docker image prune -f > /dev/null 2>&1 || true
    local after=$(docker images -q | wc -l)

    local removed=$((before - after))
    if [ "$removed" -gt 0 ]; then
        log_success "Removidas $removed imagens não utilizadas"
    fi
}

# =====================================================
# Cloudflare Cache Purge
# =====================================================

purge_cloudflare_cache() {
    if [ -z "$CLOUDFLARE_TOKEN" ]; then
        log_warning "CLOUDFLARE_TOKEN não configurado, pulando purge de cache"
        return 0
    fi

    log_info "Limpando cache do Cloudflare..."

    local response=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache" \
        -H "Authorization: Bearer ${CLOUDFLARE_TOKEN}" \
        -H "Content-Type: application/json" \
        -d '{"purge_everything":true}')

    local success=$(echo "$response" | grep -o '"success":true' || echo "")

    if [ -n "$success" ]; then
        log_success "Cache do Cloudflare limpo com sucesso"
    else
        log_warning "Falha ao limpar cache do Cloudflare"
    fi
}

# =====================================================
# Verificação Final
# =====================================================

verify_deployment() {
    log_info "Verificando deploy..."

    # Verificar API
    local api_status=$(curl -sf http://localhost:3001/api/health 2>/dev/null | grep -o '"status":"ok"' || echo "")
    if [ -z "$api_status" ]; then
        log_error "API não está respondendo"
        return 1
    fi

    # Verificar Frontend
    local frontend_status=$(curl -sf -o /dev/null -w '%{http_code}' http://localhost:3000/ 2>/dev/null || echo "000")
    if [ "$frontend_status" != "200" ] && [ "$frontend_status" != "307" ]; then
        log_error "Frontend não está respondendo (status: $frontend_status)"
        return 1
    fi

    log_success "Deploy verificado com sucesso"
}

# =====================================================
# Rollback
# =====================================================

perform_rollback() {
    log_warning "Iniciando rollback..."

    if rollback_code; then
        build_containers || true
        restart_containers
        wait_for_healthy || true
    fi

    disable_maintenance
    log_error "Deploy falhou - rollback executado"
}

# =====================================================
# Cleanup de Logs Antigos
# =====================================================

cleanup_old_logs() {
    log_info "Limpando logs antigos (mantendo últimos 30 dias)..."

    local count=$(find "$LOG_DIR" -name "deploy-*.log" -mtime +30 2>/dev/null | wc -l)
    find "$LOG_DIR" -name "deploy-*.log" -mtime +30 -delete 2>/dev/null || true

    if [ "$count" -gt 0 ]; then
        log_success "Removidos $count logs antigos"
    fi
}

# =====================================================
# Main
# =====================================================

main() {
    # Criar diretórios
    mkdir -p "$LOG_DIR" "$BACKUP_DIR"

    echo "========================================"
    echo "  QUATRELATI ERP - Deploy v2.0.0"
    echo "  $(date '+%Y-%m-%d %H:%M:%S')"
    echo "========================================"

    log_info "Iniciando deploy..."

    cd "$DEPLOY_DIR"

    # Verificações iniciais
    check_disk_space || exit 1
    check_docker || exit 1

    # Backup
    create_backup
    cleanup_old_backups

    # Salvar commit atual para rollback
    save_current_commit

    # Ativar manutenção
    enable_maintenance

    # Deploy com tratamento de erro
    if update_code && build_containers && restart_containers && wait_for_healthy && verify_deployment; then
        disable_maintenance
        purge_cloudflare_cache
        cleanup_docker
        cleanup_old_logs

        echo ""
        echo "========================================"
        log_success "Deploy concluído com sucesso!"
        echo "  $(date '+%Y-%m-%d %H:%M:%S')"
        echo "  Log: $LOG_FILE"
        echo "========================================"
    else
        perform_rollback
        exit 1
    fi
}

# Executar
main "$@"
