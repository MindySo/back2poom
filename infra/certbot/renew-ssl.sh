#!/bin/bash

# SSL 인증서 갱신 스크립트
# 크론잡으로 실행하여 필요할 때만 certbot 컨테이너를 실행

set -e

# 스크립트 위치 기준으로 infra 디렉토리 설정
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(dirname "$SCRIPT_DIR")"

# 로그 파일 설정
LOG_FILE="$INFRA_DIR/logs/ssl-renewal.log"
mkdir -p "$(dirname "$LOG_FILE")"

# 로그 함수
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== SSL 인증서 갱신 시작 ==="

cd "$INFRA_DIR"

# certbot 컨테이너 실행하여 인증서 갱신 시도
log "certbot 컨테이너 실행 중..."
docker run --rm \
    --name certbot-renewal \
    -v "$INFRA_DIR/certbot/conf:/etc/letsencrypt" \
    -v "$INFRA_DIR/certbot/www:/var/www/certbot" \
    certbot/certbot renew --quiet

# 갱신 결과 확인
if [ $? -eq 0 ]; then
    log "인증서 갱신 완료 (또는 갱신 불필요)"

    # nginx 컨테이너가 실행 중이면 설정 다시 로드하여 새 인증서 적용
    if docker ps --format "table {{.Names}}" | grep -q "topoom-nginx"; then
        log "nginx 설정 다시 로드 중..."
        docker exec topoom-nginx nginx -s reload
        log "nginx 설정 다시 로드 완료"
    else
        log "nginx 컨테이너가 실행 중이지 않음"
    fi
else
    log "ERROR: 인증서 갱신 실패"
    exit 1
fi

log "=== SSL 인증서 갱신 완료 ==="