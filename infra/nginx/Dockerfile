# Stage 1: Frontend 빌드
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# package.json과 package-lock.json 복사 (캐시 최적화)
COPY frontend/poom/package*.json ./

# 의존성 설치
RUN npm ci

# 소스코드 복사
COPY frontend/poom/ .

# 프론트엔드 빌드
RUN npm run build

# Stage 2: nginx 서버
FROM nginx:latest

# nginx 설정 복사
COPY infra/nginx/nginx.conf /etc/nginx/nginx.conf

# 빌드된 프론트엔드 파일 복사
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# 포트 노출
EXPOSE 80 443