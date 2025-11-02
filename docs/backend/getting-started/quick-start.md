# 快速启动指南

## 概述

本指南将帮助您快速启动 Rubick 后端开发环境，包括数据库初始化、服务启动和基本测试。

## 前置条件

在开始之前，请确保已完成[环境搭建](./environment-setup.md)。

## 快速启动

### 1. 克隆项目

```bash
# 克隆后端仓库
git clone https://github.com/rubickCenter/rubick-backend.git
cd rubick-backend

# 查看项目结构
ls -la
```

### 2. 启动依赖服务

使用 Docker Compose 快速启动数据库和 Redis：

```bash
# 启动依赖服务
docker-compose -f deployments/docker/docker-compose.dev.yml up -d

# 查看服务状态
docker-compose -f deployments/docker/docker-compose.dev.yml ps
```

### 3. 配置环境变量

```bash
# 复制配置文件
cp configs/config.example.yaml configs/config.yaml

# 编辑配置文件
vim configs/config.yaml
```

或者使用环境变量：

```bash
# 设置环境变量
export RUBICK_DB_HOST=localhost
export RUBICK_DB_PORT=5432
export RUBICK_DB_USER=rubick
export RUBICK_DB_PASSWORD=password
export RUBICK_DB_NAME=rubick_dev
export RUBICK_REDIS_HOST=localhost
export RUBICK_REDIS_PORT=6379
export RUBICK_JWT_SECRET=your-secret-key
export RUBICK_APP_PORT=8080
```

### 4. 初始化数据库

```bash
# 运行数据库迁移
go run cmd/migrate/main.go up

# 或者使用 make 命令
make migrate-up
```

### 5. 安装依赖

```bash
# 下载 Go 模块
go mod download

# 整理依赖
go mod tidy
```

### 6. 启动服务

```bash
# 开发模式启动
go run cmd/server/main.go

# 或者使用 make 命令
make run

# 或者使用 air 实现热重载
make dev
```

### 7. 验证服务

```bash
# 健康检查
curl http://localhost:8080/health

# API 版本信息
curl http://localhost:8080/api/v1/version

# 插件列表
curl http://localhost:8080/api/v1/plugins
```

## 使用 Makefile

项目提供了 Makefile 来简化常用操作：

```makefile
# Makefile
.PHONY: help build run test clean migrate-up migrate-down docker-up docker-down

help: ## 显示帮助信息
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

build: ## 构建应用程序
	go build -o bin/server cmd/server/main.go

run: ## 运行应用程序
	go run cmd/server/main.go

dev: ## 开发模式运行（热重载）
	air -c .air.toml

test: ## 运行测试
	go test -v ./...

test-coverage: ## 运行测试并生成覆盖率报告
	go test -v -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out

clean: ## 清理构建文件
	rm -rf bin/
	rm -f coverage.out coverage.html

migrate-up: ## 运行数据库迁移
	go run cmd/migrate/main.go up

migrate-down: ## 回滚数据库迁移
	go run cmd/migrate/main.go down

migrate-create: ## 创建新的迁移文件
	@if [ -z "$(NAME)" ]; then echo "Usage: make migrate-create NAME=migration_name"; exit 1; fi
	migrate create -ext sql -dir internal/database/migrations -seq $(NAME)

docker-up: ## 启动 Docker 服务
	docker-compose -f deployments/docker/docker-compose.dev.yml up -d

docker-down: ## 停止 Docker 服务
	docker-compose -f deployments/docker/docker-compose.dev.yml down

docker-logs: ## 查看 Docker 日志
	docker-compose -f deployments/docker/docker-compose.dev.yml logs -f

lint: ## 代码检查
	golangci-lint run

fmt: ## 格式化代码
	go fmt ./...
	goimports -w .

install-tools: ## 安装开发工具
	go install github.com/cosmtrek/air@latest
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	go install golang.org/x/tools/cmd/goimports@latest
```

### 使用 Makefile 命令

```bash
# 查看所有可用命令
make help

# 启动开发环境
make docker-up
make migrate-up
make dev

# 运行测试
make test

# 代码检查和格式化
make lint
make fmt

# 清理环境
make docker-down
make clean
```

## 开发工具配置

### Air 热重载配置

创建 `.air.toml` 文件：

```toml
# .air.toml
root = "."
testdata_dir = "testdata"
tmp_dir = "tmp"

[build]
  args_bin = []
  bin = "./tmp/main"
  cmd = "go build -o ./tmp/main ./cmd/server"
  delay = 1000
  exclude_dir = ["assets", "tmp", "vendor", "testdata"]
  exclude_file = []
  exclude_regex = ["_test.go"]
  exclude_unchanged = false
  follow_symlink = false
  full_bin = ""
  include_dir = []
  include_ext = ["go", "tpl", "tmpl", "html"]
  kill_delay = "0s"
  log = "build-errors.log"
  send_interrupt = false
  stop_on_root = false

[color]
  app = ""
  build = "yellow"
  main = "magenta"
  runner = "green"
  watcher = "cyan"

[log]
  time = true

[misc]
  clean_on_exit = false
```

### Golangci-lint 配置

创建 `.golangci.yml` 文件：

```yaml
# .golangci.yml
run:
  timeout: 5m
  tests: true

output:
  format: colored-line-number
  print-issued-lines: true
  print-linter-name: true

linters-settings:
  govet:
    check-shadowing: true
  golint:
    min-confidence: 0
  gocyclo:
    min-complexity: 15
  maligned:
    suggest-new: true
  dupl:
    threshold: 100
  goconst:
    min-len: 2
    min-occurrences: 2
  misspell:
    locale: US
  lll:
    line-length: 140
  goimports:
    local-prefixes: github.com/rubickCenter/rubick-backend
  gocritic:
    enabled-tags:
      - diagnostic
      - experimental
      - opinionated
      - performance
      - style
    disabled-checks:
      - dupImport
      - ifElseChain
      - octalLiteral
      - whyNoLint
      - wrapperFunc

linters:
  enable:
    - bodyclose
    - deadcode
    - depguard
    - dogsled
    - dupl
    - errcheck
    - funlen
    - gochecknoinits
    - goconst
    - gocritic
    - gocyclo
    - gofmt
    - goimports
    - golint
    - gomnd
    - goprintffuncname
    - gosec
    - gosimple
    - govet
    - ineffassign
    - interfacer
    - lll
    - misspell
    - nakedret
    - rowserrcheck
    - scopelint
    - staticcheck
    - structcheck
    - stylecheck
    - typecheck
    - unconvert
    - unparam
    - unused
    - varcheck
    - whitespace

issues:
  exclude-rules:
    - G204: Subprocess launched with variable
  exclude-use-default: false
  max-issues-per-linter: 0
  max-same-issues: 0
  new: false
```

## API 测试

### 使用 curl 测试

```bash
# 健康检查
curl -X GET http://localhost:8080/health

# 获取插件列表
curl -X GET http://localhost:8080/api/v1/plugins

# 创建插件
curl -X POST http://localhost:8080/api/v1/plugins \
  -H "Content-Type: application/json" \
  -d '{
    "name": "example-plugin",
    "description": "An example plugin",
    "version": "1.0.0",
    "author": "Example Author",
    "category": "utility"
  }'

# 获取特定插件
curl -X GET http://localhost:8080/api/v1/plugins/example-plugin

# 更新插件
curl -X PUT http://localhost:8080/api/v1/plugins/example-plugin \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated description"
  }'

# 删除插件
curl -X DELETE http://localhost:8080/api/v1/plugins/example-plugin
```

### 使用 Postman 测试

1. 导入 Postman 集合：
   ```json
   {
     "info": {
       "name": "Rubick Backend API",
       "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
     },
     "item": [
       {
         "name": "Health Check",
         "request": {
           "method": "GET",
           "header": [],
           "url": {
             "raw": "http://localhost:8080/health",
             "protocol": "http",
             "host": ["localhost"],
             "port": "8080",
             "path": ["health"]
           }
         }
       },
       {
         "name": "List Plugins",
         "request": {
           "method": "GET",
           "header": [],
           "url": {
             "raw": "http://localhost:8080/api/v1/plugins",
             "protocol": "http",
             "host": ["localhost"],
             "port": "8080",
             "path": ["api", "v1", "plugins"]
           }
         }
       }
     ]
   }
   ```

2. 设置环境变量：
   - `base_url`: `http://localhost:8080`
   - `api_key`: （如果需要认证）

## 数据库操作

### 查看数据库

```bash
# 连接到 PostgreSQL
docker-compose -f deployments/docker/docker-compose.dev.yml exec postgres psql -U rubick -d rubick_dev

# 查看表结构
\dt

# 查看插件表
SELECT * FROM plugins LIMIT 10;

# 退出
\q
```

### 运行迁移

```bash
# 创建新迁移
make migrate-create NAME=add_plugin_rating

# 运行迁移
make migrate-up

# 回滚迁移
make migrate-down

# 查看迁移状态
go run cmd/migrate/main.go version
```

### 种子数据

```bash
# 运行种子数据
go run cmd/seed/main.go

# 或者使用 make 命令
make seed
```

## 日志查看

### 应用日志

```bash
# 查看实时日志
tail -f logs/app.log

# 查看错误日志
grep ERROR logs/app.log

# 查看特定时间段的日志
grep "2023-01-01" logs/app.log
```

### Docker 日志

```bash
# 查看所有服务日志
make docker-logs

# 查看特定服务日志
docker-compose -f deployments/docker/docker-compose.dev.yml logs postgres
docker-compose -f deployments/docker/docker-compose.dev.yml logs redis
```

## 性能监控

### 应用性能

```bash
# 安装 pprof
go install github.com/google/pprof@latest

# 启用 pprof
export RUBICK_PPROF_ENABLED=true

# 访问 pprof
go tool pprof http://localhost:8080/debug/pprof/profile
```

### 数据库性能

```bash
# 查看慢查询
docker-compose -f deployments/docker/docker-compose.dev.yml exec postgres psql -U rubick -d rubick_dev -c "
  SELECT query, mean_time, calls 
  FROM pg_stat_statements 
  ORDER BY mean_time DESC 
  LIMIT 10;
"

# 查看索引使用情况
docker-compose -f deployments/docker/docker-compose.dev.yml exec postgres psql -U rubick -d rubick_dev -c "
  SELECT schemaname, tablename, attname, n_distinct, correlation 
  FROM pg_stats 
  WHERE n_distinct > 0;
"
```

## 常见问题

### 启动失败

**Q: 服务启动失败，提示端口被占用**

A: 检查端口占用情况：
```bash
# 查看端口占用
lsof -i :8080

# 杀死占用进程
kill -9 <PID>

# 或者修改配置文件中的端口
vim configs/config.yaml
```

**Q: 数据库连接失败**

A: 检查数据库配置和服务状态：
```bash
# 检查数据库服务
docker-compose -f deployments/docker/docker-compose.dev.yml ps

# 测试数据库连接
docker-compose -f deployments/docker/docker-compose.dev.yml exec postgres psql -U rubick -d rubick_dev -c "SELECT 1;"

# 检查配置文件
cat configs/config.yaml | grep database
```

### 依赖问题

**Q: go mod download 失败**

A: 设置 Go 模块代理：
```bash
go env -w GOPROXY=https://goproxy.cn,direct
go mod download
```

**Q: 编译错误：undefined: type**

A: 清理并重新安装依赖：
```bash
go clean -modcache
go mod download
go mod tidy
```

### 测试问题

**Q: 测试失败：connection refused**

A: 确保测试环境已启动：
```bash
# 启动测试数据库
docker-compose -f deployments/docker/docker-compose.test.yml up -d

# 运行测试
make test

# 停止测试数据库
docker-compose -f deployments/docker/docker-compose.test.yml down
```

## 下一步

快速启动完成后，您可以：

1. 阅读[项目结构](./project-structure.md)了解代码组织
2. 查看[API 文档](../api/rest-api.md)了解接口设计
3. 学习[开发指南](../development/coding-standards.md)编写代码
4. 参考[部署指南](../deployment/docker.md)部署到生产环境

## 更多资源

- [Go 官方文档](https://golang.org/doc/)
- [Gin 框架文档](https://gin-gonic.com/docs/)
- [GORM 文档](https://gorm.io/docs/)
- [Docker 文档](https://docs.docker.com/)
- [PostgreSQL 文档](https://www.postgresql.org/docs/)