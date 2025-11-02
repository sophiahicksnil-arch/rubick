# 环境搭建指南

## 系统要求

### 基础环境

- **操作系统**: Linux/macOS/Windows
- **Go**: 1.19 或更高版本
- **Git**: 2.0 或更高版本
- **Docker**: 20.10 或更高版本（可选）
- **Docker Compose**: 2.0 或更高版本（可选）

### 数据库

- **PostgreSQL**: 13.0 或更高版本
- **Redis**: 6.0 或更高版本
- **MySQL**: 8.0 或更高版本（可选）

### 开发工具

- **IDE**: VS Code / GoLand / Vim
- **API 测试**: Postman / Insomnia
- **数据库管理**: pgAdmin / DBeaver

## Go 环境安装

### macOS

```bash
# 使用 Homebrew 安装
brew install go

# 验证安装
go version
```

### Linux (Ubuntu/Debian)

```bash
# 使用 apt 安装
sudo apt update
sudo apt install golang-go

# 或者下载二进制包
wget https://go.dev/dl/go1.19.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.19.linux-amd64.tar.gz

# 添加到 PATH
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc

# 验证安装
go version
```

### Windows

1. 下载 [Go 安装包](https://go.dev/dl/)
2. 运行安装程序
3. 验证安装：
   ```powershell
   go version
   ```

## 开发环境配置

### 环境变量

在 `~/.bashrc` 或 `~/.zshrc` 中添加：

```bash
# Go 环境变量
export GOPATH=$HOME/go
export GOROOT=/usr/local/go
export GOBIN=$GOPATH/bin
export PATH=$PATH:$GOROOT/bin:$GOBIN

# 项目环境变量
export RUBICK_BACKEND_ENV=development
export RUBICK_DB_HOST=localhost
export RUBICK_DB_PORT=5432
export RUBICK_DB_USER=rubick
export RUBICK_DB_PASSWORD=password
export RUBICK_DB_NAME=rubick_dev
export RUBICK_REDIS_HOST=localhost
export RUBICK_REDIS_PORT=6379
export RUBICK_REDIS_PASSWORD=
```

### Go 模块代理

```bash
# 设置 Go 模块代理（国内用户）
go env -w GOPROXY=https://goproxy.cn,direct
go env -w GOSUMDB=sum.golang.google.cn
```

## 数据库安装

### PostgreSQL

#### Docker 方式（推荐）

```bash
# 创建 docker-compose.yml
cat > docker-compose.yml << EOF
version: '3.8'
services:
  postgres:
    image: postgres:13
    environment:
      POSTGRES_DB: rubick_dev
      POSTGRES_USER: rubick
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
EOF

# 启动服务
docker-compose up -d
```

#### 本地安装

**macOS**:
```bash
brew install postgresql
brew services start postgresql

# 创建数据库
createdb rubick_dev
createuser rubick
psql -c "ALTER USER rubick PASSWORD 'password';"
```

**Linux**:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql

# 创建数据库
sudo -u postgres createdb rubick_dev
sudo -u postgres createuser rubick
sudo -u postgres psql -c "ALTER USER rubick PASSWORD 'password';"
```

### Redis

#### Docker 方式（已包含在上面的 docker-compose.yml 中）

#### 本地安装

**macOS**:
```bash
brew install redis
brew services start redis
```

**Linux**:
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
```

## 项目初始化

### 克隆仓库

```bash
# 克隆后端仓库
git clone https://github.com/rubickCenter/rubick-backend.git
cd rubick-backend

# 克隆前端仓库（可选）
git clone https://github.com/rubickCenter/rubick.git
```

### 安装依赖

```bash
# 下载 Go 模块
go mod download

# 验证依赖
go mod verify
```

### 数据库初始化

```bash
# 运行数据库迁移
go run cmd/migrate/main.go up

# 或者使用 migrate 工具
migrate -path migrations -database "postgres://rubick:password@localhost:5432/rubick_dev?sslmode=disable" up
```

### 配置文件

创建配置文件 `config/config.yaml`：

```yaml
app:
  name: "Rubick Backend"
  version: "1.0.0"
  env: "development"
  debug: true
  port: 8080

database:
  host: "localhost"
  port: 5432
  user: "rubick"
  password: "password"
  name: "rubick_dev"
  ssl_mode: "disable"
  max_open_conns: 100
  max_idle_conns: 10
  conn_max_lifetime: "1h"

redis:
  host: "localhost"
  port: 6379
  password: ""
  db: 0
  pool_size: 10

jwt:
  secret: "your-secret-key"
  expire_hours: 24

log:
  level: "debug"
  format: "json"
  output: "stdout"

storage:
  type: "local" # local, s3, oss
  local:
    path: "./uploads"
  s3:
    region: "us-east-1"
    bucket: "rubick-uploads"
    access_key: "your-access-key"
    secret_key: "your-secret-key"
```

## 开发工具配置

### VS Code

推荐安装以下扩展：

- Go (官方)
- Docker
- YAML
- REST Client
- GitLens

创建 `.vscode/settings.json`：

```json
{
  "go.useLanguageServer": true,
  "go.toolsManagement.checkForUpdates": "local",
  "go.gopath": "",
  "go.goroot": "",
  "go.formatTool": "goimports",
  "go.lintTool": "golangci-lint",
  "go.testFlags": ["-v"],
  "go.buildFlags": [],
  "go.testTimeout": "30s",
  "go.coverOnSave": true,
  "go.coverageDecorator": {
    "type": "gutter",
    "coveredHighlightColor": "rgba(64,128,64,0.5)",
    "uncoveredHighlightColor": "rgba(128,64,64,0.25)"
  }
}
```

创建 `.vscode/launch.json`：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch",
      "type": "go",
      "request": "launch",
      "mode": "auto",
      "program": "${workspaceFolder}/cmd/server/main.go",
      "env": {
        "RUBICK_BACKEND_ENV": "development"
      },
      "args": []
    },
    {
      "name": "Launch Tests",
      "type": "go",
      "request": "launch",
      "mode": "test",
      "program": "${workspaceFolder}",
      "env": {
        "RUBICK_BACKEND_ENV": "test"
      }
    }
  ]
}
```

### GoLand

1. 打开项目目录
2. 配置 Go SDK
3. 设置运行配置
4. 配置数据库连接

## 验证环境

### 运行项目

```bash
# 开发模式运行
go run cmd/server/main.go

# 或者使用 air 实现热重载
go install github.com/cosmtrek/air@latest
air
```

### 运行测试

```bash
# 运行所有测试
go test ./...

# 运行特定包的测试
go test ./internal/handlers

# 运行测试并生成覆盖率报告
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

### API 测试

```bash
# 健康检查
curl http://localhost:8080/health

# API 测试
curl -X GET http://localhost:8080/api/v1/plugins
```

## 常见问题

### Go 环境问题

**Q: go mod download 失败**

A: 设置 Go 模块代理：
```bash
go env -w GOPROXY=https://goproxy.cn,direct
```

**Q: 编译错误：undefined: type**

A: 检查 Go 版本和模块导入：
```bash
go version
go mod tidy
```

### 数据库连接问题

**Q: 连接 PostgreSQL 失败**

A: 检查数据库配置和服务状态：
```bash
# 检查服务状态
docker-compose ps

# 查看日志
docker-compose logs postgres

# 测试连接
psql -h localhost -U rubick -d rubick_dev
```

**Q: Redis 连接失败**

A: 检查 Redis 配置：
```bash
# 测试连接
redis-cli ping

# 查看配置
redis-cli config get "*"
```

### 依赖问题

**Q: 依赖版本冲突**

A: 清理并重新安装依赖：
```bash
go clean -modcache
go mod download
go mod tidy
```

## 下一步

环境搭建完成后，您可以：

1. 阅读[项目结构](./project-structure.md)了解代码组织
2. 查看[快速启动](./quick-start.md)启动开发服务
3. 学习[API 文档](../api/rest-api.md)了解接口设计
4. 参考[开发指南](../development/coding-standards.md)编写代码

## 更多资源

- [Go 官方文档](https://golang.org/doc/)
- [GORM 文档](https://gorm.io/docs/)
- [Gin 框架文档](https://gin-gonic.com/docs/)
- [Docker 文档](https://docs.docker.com/)
- [PostgreSQL 文档](https://www.postgresql.org/docs/)