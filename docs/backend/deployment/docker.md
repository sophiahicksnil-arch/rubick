# Docker 部署指南

## 概述

本指南介绍如何使用 Docker 部署 Rubick 后端服务，包括单机部署、集群部署和生产环境配置。

## Docker 基础

### 安装 Docker

#### Ubuntu/Debian

```bash
# 更新包索引
sudo apt update

# 安装必要的包
sudo apt install apt-transport-https ca-certificates curl gnupg lsb-release

# 添加 Docker 官方 GPG 密钥
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# 设置稳定版仓库
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装 Docker Engine
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io

# 启动 Docker 服务
sudo systemctl start docker
sudo systemctl enable docker

# 将当前用户添加到 docker 组
sudo usermod -aG docker $USER
```

#### CentOS/RHEL

```bash
# 安装必要的包
sudo yum install -y yum-utils

# 添加 Docker 仓库
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# 安装 Docker Engine
sudo yum install docker-ce docker-ce-cli containerd.io

# 启动 Docker 服务
sudo systemctl start docker
sudo systemctl enable docker

# 将当前用户添加到 docker 组
sudo usermod -aG docker $USER
```

#### macOS

```bash
# 使用 Homebrew 安装
brew install --cask docker

# 启动 Docker Desktop
open /Applications/Docker.app
```

#### Windows

1. 下载 [Docker Desktop](https://www.docker.com/products/docker-desktop)
2. 运行安装程序
3. 重启计算机

### 安装 Docker Compose

```bash
# Linux
sudo curl -L "https://github.com/docker/compose/releases/download/v2.12.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# macOS 和 Windows 已包含在 Docker Desktop 中
```

## 项目 Dockerfile

### 多阶段构建 Dockerfile

```dockerfile
# Dockerfile
# 构建阶段
FROM golang:1.19-alpine AS builder

# 设置工作目录
WORKDIR /app

# 安装必要的包
RUN apk add --no-cache git ca-certificates tzdata

# 复制 go mod 文件
COPY go.mod go.sum ./

# 下载依赖
RUN go mod download

# 复制源代码
COPY . .

# 构建应用
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main cmd/server/main.go

# 运行阶段
FROM alpine:latest

# 安装 ca-certificates
RUN apk --no-cache add ca-certificates tzdata

# 设置工作目录
WORKDIR /root/

# 从构建阶段复制二进制文件
COPY --from=builder /app/main .

# 复制配置文件
COPY --from=builder /app/configs ./configs

# 创建非 root 用户
RUN addgroup -g 1000 -S appgroup && \
    adduser -u 1000 -S appuser -G appgroup

# 设置时区
ENV TZ=Asia/Shanghai

# 暴露端口
EXPOSE 8080

# 切换到非 root 用户
USER appuser

# 启动应用
CMD ["./main"]
```

### 优化版 Dockerfile

```dockerfile
# Dockerfile.prod
# 构建阶段
FROM golang:1.19-alpine AS builder

# 设置工作目录
WORKDIR /app

# 安装必要的包
RUN apk add --no-cache git ca-certificates tzdata upx

# 复制 go mod 文件
COPY go.mod go.sum ./

# 下载依赖
RUN go mod download

# 复制源代码
COPY . .

# 构建应用并压缩
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main cmd/server/main.go && \
    upx --best --lzma main

# 运行阶段
FROM alpine:latest

# 安装运行时依赖
RUN apk --no-cache add ca-certificates tzdata curl && \
    rm -rf /var/cache/apk/*

# 设置工作目录
WORKDIR /app

# 从构建阶段复制二进制文件
COPY --from=builder /app/main .

# 复制配置文件
COPY --from=builder /app/configs ./configs

# 创建非 root 用户
RUN addgroup -g 1000 -S appgroup && \
    adduser -u 1000 -S appuser -G appgroup && \
    chown -R appuser:appgroup /app

# 设置时区
ENV TZ=Asia/Shanghai

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# 暴露端口
EXPOSE 8080

# 切换到非 root 用户
USER appuser

# 启动应用
CMD ["./main"]
```

## Docker Compose 配置

### 开发环境

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  # 应用服务
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      - RUBICK_BACKEND_ENV=development
      - RUBICK_DB_HOST=postgres
      - RUBICK_DB_PORT=5432
      - RUBICK_DB_USER=rubick
      - RUBICK_DB_PASSWORD=password
      - RUBICK_DB_NAME=rubick_dev
      - RUBICK_REDIS_HOST=redis
      - RUBICK_REDIS_PORT=6379
      - RUBICK_JWT_SECRET=dev-secret-key
    volumes:
      - ./configs:/app/configs
      - ./logs:/app/logs
    depends_on:
      - postgres
      - redis
    networks:
      - rubick-network

  # PostgreSQL 数据库
  postgres:
    image: postgres:13-alpine
    environment:
      POSTGRES_DB: rubick_dev
      POSTGRES_USER: rubick
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - rubick-network

  # Redis 缓存
  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - rubick-network

  # Elasticsearch 搜索引擎
  elasticsearch:
    image: elasticsearch:7.14.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
      - "9300:9300"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    networks:
      - rubick-network

volumes:
  postgres_data:
  redis_data:
  elasticsearch_data:

networks:
  rubick-network:
    driver: bridge
```

### 生产环境

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  # 应用服务
  app:
    build:
      context: .
      dockerfile: Dockerfile.prod
    ports:
      - "8080:8080"
    environment:
      - RUBICK_BACKEND_ENV=production
      - RUBICK_DB_HOST=postgres
      - RUBICK_DB_PORT=5432
      - RUBICK_DB_USER=${DB_USER}
      - RUBICK_DB_PASSWORD=${DB_PASSWORD}
      - RUBICK_DB_NAME=${DB_NAME}
      - RUBICK_REDIS_HOST=redis
      - RUBICK_REDIS_PORT=6379
      - RUBICK_JWT_SECRET=${JWT_SECRET}
    volumes:
      - ./configs:/app/configs
      - ./logs:/app/logs
      - uploads:/app/uploads
    depends_on:
      - postgres
      - redis
      - elasticsearch
    networks:
      - rubick-network
    restart: unless-stopped
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M

  # Nginx 反向代理
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - uploads:/var/www/uploads
    depends_on:
      - app
    networks:
      - rubick-network
    restart: unless-stopped

  # PostgreSQL 数据库
  postgres:
    image: postgres:13-alpine
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    networks:
      - rubick-network
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M

  # Redis 缓存
  redis:
    image: redis:6-alpine
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
      - ./redis/redis.conf:/usr/local/etc/redis/redis.conf
    networks:
      - rubick-network
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
        reservations:
          cpus: '0.25'
          memory: 128M

  # Elasticsearch 搜索引擎
  elasticsearch:
    image: elasticsearch:7.14.0
    environment:
      - cluster.name=rubick-cluster
      - node.name=rubick-node-1
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms1g -Xmx1g"
      - xpack.security.enabled=false
    ulimits:
      memlock:
        soft: -1
        hard: -1
    mem_limit: 2g
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    networks:
      - rubick-network
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 1G

volumes:
  postgres_data:
  redis_data:
  elasticsearch_data:
  uploads:

networks:
  rubick-network:
    driver: bridge
```

## 环境变量配置

### .env 文件

```bash
# .env
# 应用配置
RUBICK_BACKEND_ENV=production
RUBICK_APP_PORT=8080
RUBICK_JWT_SECRET=your-super-secret-jwt-key

# 数据库配置
DB_USER=rubick
DB_PASSWORD=your-database-password
DB_NAME=rubick_prod
DB_HOST=postgres
DB_PORT=5432

# Redis 配置
REDIS_PASSWORD=your-redis-password
REDIS_HOST=redis
REDIS_PORT=6379

# 文件存储配置
STORAGE_TYPE=s3
S3_REGION=us-east-1
S3_BUCKET=rubick-uploads
S3_ACCESS_KEY=your-s3-access-key
S3_SECRET_KEY=your-s3-secret-key

# 邮件配置
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASSWORD=your-smtp-password
SMTP_FROM=Rubick <noreply@example.com>
```

## 构建和部署

### 本地构建

```bash
# 构建镜像
docker build -t rubick-backend:latest .

# 构建生产镜像
docker build -f Dockerfile.prod -t rubick-backend:prod .
```

### 使用 Docker Compose 部署

```bash
# 开发环境
docker-compose -f docker-compose.dev.yml up -d

# 生产环境
docker-compose -f docker-compose.prod.yml up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f app

# 停止服务
docker-compose down

# 重新构建并启动
docker-compose up -d --build
```

### 生产环境部署

```bash
# 1. 克隆项目
git clone https://github.com/rubickCenter/rubick-backend.git
cd rubick-backend

# 2. 配置环境变量
cp .env.example .env
vim .env

# 3. 创建必要的目录
mkdir -p logs backups uploads nginx/ssl

# 4. 配置 Nginx
vim nginx/nginx.conf

# 5. 启动服务
docker-compose -f docker-compose.prod.yml up -d

# 6. 初始化数据库
docker-compose exec app go run cmd/migrate/main.go up

# 7. 创建管理员用户
docker-compose exec app go run cmd/admin/main.go create
```

## Nginx 配置

### nginx.conf

```nginx
# nginx/nginx.conf
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # 日志格式
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;
    error_log   /var/log/nginx/error.log;

    # 基础配置
    sendfile        on;
    tcp_nopush      on;
    tcp_nodelay     on;
    keepalive_timeout  65;
    types_hash_max_size 2048;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # 上游服务器
    upstream rubick_backend {
        server app:8080;
        keepalive 32;
    }

    # HTTP 重定向到 HTTPS
    server {
        listen 80;
        server_name api.rubick.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS 服务器
    server {
        listen 443 ssl http2;
        server_name api.rubick.com;

        # SSL 配置
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_session_timeout 1d;
        ssl_session_cache shared:SSL:50m;
        ssl_session_tickets off;

        # 现代 SSL 配置
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;

        # HSTS
        add_header Strict-Transport-Security "max-age=63072000" always;

        # 安全头
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";

        # API 路由
        location /api/ {
            proxy_pass http://rubick_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 86400s;
        }

        # 健康检查
        location /health {
            proxy_pass http://rubick_backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # 文件上传
        location /uploads/ {
            alias /var/www/uploads/;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # 静态文件
        location /static/ {
            alias /var/www/static/;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

## 监控和日志

### 日志配置

```yaml
# docker-compose.logging.yml
version: '3.8'

services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
        labels: "service=app,environment=production"

  # 日志收集
  fluentd:
    image: fluent/fluentd:v1.14-debian-1
    volumes:
      - ./fluentd/fluent.conf:/fluentd/etc/fluent.conf
      - ./logs:/var/log
    depends_on:
      - app
    networks:
      - rubick-network

  # Elasticsearch
  elasticsearch:
    image: elasticsearch:7.14.0
    environment:
      - "discovery.type=single-node"
    networks:
      - rubick-network

networks:
  rubick-network:
    driver: bridge
```

### 监控配置

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  # Prometheus
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
    networks:
      - rubick-network

  # Grafana
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources
    depends_on:
      - prometheus
    networks:
      - rubick-network

volumes:
  prometheus_data:
  grafana_data:

networks:
  rubick-network:
    driver: bridge
```

## 备份和恢复

### 数据库备份

```bash
# 创建备份脚本
cat > backup.sh << 'EOF'
#!/bin/bash

# 配置
BACKUP_DIR="/backups"
DB_NAME="rubick_prod"
DB_USER="rubick"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/rubick_backup_$TIMESTAMP.sql"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份数据库
docker-compose exec postgres pg_dump -U $DB_USER $DB_NAME > $BACKUP_FILE

# 压缩备份文件
gzip $BACKUP_FILE

# 删除 7 天前的备份
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE.gz"
EOF

chmod +x backup.sh

# 执行备份
./backup.sh
```

### 自动备份

```bash
# 添加到 crontab
crontab -e

# 每天凌晨 2 点备份
0 2 * * * /path/to/backup.sh
```

### 数据恢复

```bash
# 恢复脚本
cat > restore.sh << 'EOF'
#!/bin/bash

if [ -z "$1" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

BACKUP_FILE=$1
DB_NAME="rubick_prod"
DB_USER="rubick"

# 停止应用
docker-compose stop app

# 恢复数据库
gunzip -c $BACKUP_FILE | docker-compose exec -T postgres psql -U $DB_USER $DB_NAME

# 启动应用
docker-compose start app

echo "Restore completed from: $BACKUP_FILE"
EOF

chmod +x restore.sh

# 执行恢复
./restore.sh /backups/rubick_backup_20230101_020000.sql.gz
```

## 性能优化

### 资源限制

```yaml
# docker-compose.optimized.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.prod
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### 缓存优化

```yaml
# Redis 配置
redis:
  image: redis:6-alpine
  command: redis-server /usr/local/etc/redis/redis.conf
  volumes:
    - ./redis/redis.conf:/usr/local/etc/redis/redis.conf
    - redis_data:/data
  sysctls:
    - net.core.somaxconn=65535
```

```conf
# redis/redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

## 故障排除

### 常见问题

**Q: 容器启动失败**

A: 检查日志：
```bash
# 查看容器日志
docker-compose logs app

# 查看容器状态
docker-compose ps

# 进入容器调试
docker-compose exec app sh
```

**Q: 数据库连接失败**

A: 检查网络和配置：
```bash
# 检查网络
docker network ls
docker network inspect rubick-backend_rubick-network

# 测试数据库连接
docker-compose exec postgres psql -U rubick -d rubick_prod -c "SELECT 1;"
```

**Q: 内存不足**

A: 优化资源使用：
```bash
# 查看资源使用
docker stats

# 清理未使用的镜像
docker image prune -f

# 清理未使用的容器
docker container prune -f
```

### 调试技巧

```bash
# 1. 查看详细日志
docker-compose logs --tail=100 -f app

# 2. 实时查看日志
docker-compose logs -f app

# 3. 进入容器调试
docker-compose exec app sh

# 4. 检查容器内部网络
docker-compose exec app ip addr

# 5. 检查端口映射
docker-compose port app 8080
```

## 更多资源

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [Nginx 官方文档](https://nginx.org/en/docs/)
- [Prometheus 文档](https://prometheus.io/docs/)
- [Grafana 文档](https://grafana.com/docs/)