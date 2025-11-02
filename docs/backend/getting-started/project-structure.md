# 项目结构说明

## 目录结构

Rubick 后端采用标准的 Go 项目布局，遵循 [Go 项目标准布局](https://github.com/golang-standards/project-layout) 规范。

```
rubick-backend/
├── api/                    # API 定义（OpenAPI/Swagger）
│   ├── v1/                # API v1 版本
│   │   ├── plugin.go       # 插件相关 API
│   │   ├── user.go         # 用户相关 API
│   │   └── auth.go         # 认证相关 API
│   └── middleware/          # 中间件定义
│       ├── auth.go         # 认证中间件
│       ├── cors.go         # CORS 中间件
│       └── logging.go      # 日志中间件
├── cmd/                    # 应用程序入口
│   ├── server/             # Web 服务器
│   │   └── main.go        # 服务器主程序
│   ├── migrate/            # 数据库迁移工具
│   │   └── main.go        # 迁移工具主程序
│   └── worker/             # 后台任务处理器
│       └── main.go        # Worker 主程序
├── internal/               # 私有应用程序代码
│   ├── config/            # 配置管理
│   │   └── config.go      # 配置结构定义和加载
│   ├── database/          # 数据库相关
│   │   ├── connection.go  # 数据库连接
│   │   └── migrations/    # 数据库迁移文件
│   ├── handlers/          # HTTP 处理程序
│   │   ├── plugin.go     # 插件处理器
│   │   ├── user.go       # 用户处理器
│   │   └── auth.go       # 认证处理器
│   ├── models/            # 数据模型
│   │   ├── plugin.go     # 插件模型
│   │   ├── user.go       # 用户模型
│   │   └── common.go     # 通用模型
│   ├── repositories/      # 数据访问层
│   │   ├── plugin.go     # 插件仓库
│   │   ├── user.go       # 用户仓库
│   │   └── interfaces.go  # 仓库接口定义
│   ├── services/          # 业务逻辑层
│   │   ├── plugin.go     # 插件服务
│   │   ├── user.go       # 用户服务
│   │   └── auth.go       # 认证服务
│   ├── utils/             # 工具函数
│   │   ├── jwt.go         # JWT 工具
│   │   ├── hash.go        # 哈希工具
│   │   └── validator.go   # 验证工具
│   └── workers/           # 后台任务
│       ├── plugin.go     # 插件相关任务
│       └── notification.go # 通知任务
├── pkg/                   # 可被外部应用程序使用的库代码
│   ├── logger/            # 日志库
│   │   └── logger.go     # 日志实现
│   ├── errors/            # 错误处理库
│   │   └── errors.go     # 错误定义
│   └── response/          # HTTP 响应库
│       └── response.go   # 响应结构定义
├── scripts/               # 脚本文件
│   ├── build.sh          # 构建脚本
│   ├── deploy.sh         # 部署脚本
│   └── test.sh           # 测试脚本
├── configs/               # 配置文件
│   ├── config.yaml        # 默认配置
│   ├── config.dev.yaml    # 开发环境配置
│   ├── config.prod.yaml   # 生产环境配置
│   └── config.test.yaml   # 测试环境配置
├── deployments/            # 部署相关文件
│   ├── docker/           # Docker 相关文件
│   │   ├── Dockerfile     # 应用 Dockerfile
│   │   └── docker-compose.yml # Docker Compose 文件
│   └── k8s/             # Kubernetes 部署文件
│       ├── deployment.yaml # 部署配置
│       ├── service.yaml    # 服务配置
│       └── ingress.yaml    # 入口配置
├── docs/                  # 项目文档
│   ├── api/              # API 文档
│   └── architecture/     # 架构文档
├── tests/                 # 测试文件
│   ├── integration/       # 集成测试
│   ├── unit/             # 单元测试
│   └── fixtures/         # 测试数据
├── web/                   # Web 应用程序资源
│   ├── static/           # 静态资源
│   └── templates/        # 模板文件
├── go.mod                 # Go 模块定义
├── go.sum                 # Go 模块校验和
├── Makefile               # Makefile
├── README.md              # 项目说明
├── CHANGELOG.md           # 变更日志
└── LICENSE                # 许可证
```

## 核心组件说明

### API 层

API 层负责处理 HTTP 请求和响应，位于 `api/` 目录。

#### 路由定义

```go
// api/v1/plugin.go
package v1

import (
    "github.com/gin-gonic/gin"
    "rubick-backend/internal/handlers"
)

func RegisterPluginRoutes(r *gin.Engine, h *handlers.PluginHandler) {
    v1 := r.Group("/api/v1")
    {
        plugins := v1.Group("/plugins")
        {
            plugins.GET("", h.ListPlugins)
            plugins.GET("/:id", h.GetPlugin)
            plugins.POST("", h.CreatePlugin)
            plugins.PUT("/:id", h.UpdatePlugin)
            plugins.DELETE("/:id", h.DeletePlugin)
        }
    }
}
```

#### 中间件

```go
// api/middleware/auth.go
package middleware

import (
    "net/http"
    "rubick-backend/internal/utils"
    "github.com/gin-gonic/gin"
)

func AuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        token := c.GetHeader("Authorization")
        if token == "" {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
            c.Abort()
            return
        }
        
        claims, err := utils.ValidateJWT(token)
        if err != nil {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
            c.Abort()
            return
        }
        
        c.Set("user_id", claims.UserID)
        c.Next()
    }
}
```

### 业务逻辑层

业务逻辑层位于 `internal/services/` 目录，负责处理核心业务逻辑。

#### 服务接口

```go
// internal/services/interfaces.go
package services

import (
    "rubick-backend/internal/models"
)

type PluginService interface {
    ListPlugins(filter PluginFilter) ([]*models.Plugin, error)
    GetPlugin(id string) (*models.Plugin, error)
    CreatePlugin(plugin *models.Plugin) error
    UpdatePlugin(id string, plugin *models.Plugin) error
    DeletePlugin(id string) error
}

type PluginFilter struct {
    Category    string
    Author      string
    Page        int
    PageSize    int
    SortBy      string
    SortOrder   string
}
```

#### 服务实现

```go
// internal/services/plugin.go
package services

import (
    "rubick-backend/internal/models"
    "rubick-backend/internal/repositories"
)

type pluginService struct {
    pluginRepo repositories.PluginRepository
}

func NewPluginService(repo repositories.PluginRepository) PluginService {
    return &pluginService{
        pluginRepo: repo,
    }
}

func (s *pluginService) ListPlugins(filter PluginFilter) ([]*models.Plugin, error) {
    return s.pluginRepo.List(filter)
}

func (s *pluginService) GetPlugin(id string) (*models.Plugin, error) {
    return s.pluginRepo.GetByID(id)
}

func (s *pluginService) CreatePlugin(plugin *models.Plugin) error {
    // 业务逻辑验证
    if err := plugin.Validate(); err != nil {
        return err
    }
    
    // 创建插件
    return s.pluginRepo.Create(plugin)
}
```

### 数据访问层

数据访问层位于 `internal/repositories/` 目录，负责与数据库交互。

#### 仓库接口

```go
// internal/repositories/interfaces.go
package repositories

import (
    "rubick-backend/internal/models"
)

type PluginRepository interface {
    List(filter PluginFilter) ([]*models.Plugin, error)
    GetByID(id string) (*models.Plugin, error)
    Create(plugin *models.Plugin) error
    Update(id string, plugin *models.Plugin) error
    Delete(id string) error
    GetByCategory(category string) ([]*models.Plugin, error)
    GetByAuthor(author string) ([]*models.Plugin, error)
}
```

#### 仓库实现

```go
// internal/repositories/plugin.go
package repositories

import (
    "rubick-backend/internal/models"
    "gorm.io/gorm"
)

type pluginRepository struct {
    db *gorm.DB
}

func NewPluginRepository(db *gorm.DB) PluginRepository {
    return &pluginRepository{
        db: db,
    }
}

func (r *pluginRepository) List(filter PluginFilter) ([]*models.Plugin, error) {
    var plugins []*models.Plugin
    query := r.db.Model(&models.Plugin{})
    
    if filter.Category != "" {
        query = query.Where("category = ?", filter.Category)
    }
    
    if filter.Author != "" {
        query = query.Where("author = ?", filter.Author)
    }
    
    // 排序
    if filter.SortBy != "" {
        order := filter.SortBy
        if filter.SortOrder == "desc" {
            order += " DESC"
        }
        query = query.Order(order)
    }
    
    // 分页
    offset := (filter.Page - 1) * filter.PageSize
    query = query.Offset(offset).Limit(filter.PageSize)
    
    if err := query.Find(&plugins).Error; err != nil {
        return nil, err
    }
    
    return plugins, nil
}
```

### 数据模型

数据模型位于 `internal/models/` 目录，定义数据库表结构。

```go
// internal/models/plugin.go
package models

import (
    "time"
    "gorm.io/gorm"
)

type Plugin struct {
    ID          string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
    Name        string    `gorm:"not null;size:255" json:"name"`
    Description string    `gorm:"type:text" json:"description"`
    Version     string    `gorm:"not null;size:50" json:"version"`
    Author      string    `gorm:"not null;size:255" json:"author"`
    Category    string    `gorm:"not null;size:100" json:"category"`
    Tags        string    `gorm:"type:text" json:"tags"`
    Homepage    string    `gorm:"size:500" json:"homepage"`
    Repository  string    `gorm:"size:500" json:"repository"`
    License     string    `gorm:"size:100" json:"license"`
    Downloads   int       `gorm:"default:0" json:"downloads"`
    Rating      float64   `gorm:"default:0" json:"rating"`
    IsActive    bool      `gorm:"default:true" json:"is_active"`
    CreatedAt   time.Time `gorm:"autoCreateTime" json:"created_at"`
    UpdatedAt   time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (p *Plugin) Validate() error {
    if p.Name == "" {
        return errors.New("plugin name is required")
    }
    
    if p.Version == "" {
        return errors.New("plugin version is required")
    }
    
    if p.Author == "" {
        return errors.New("plugin author is required")
    }
    
    return nil
}
```

### 配置管理

配置管理位于 `internal/config/` 目录。

```go
// internal/config/config.go
package config

import (
    "fmt"
    "os"
    "github.com/spf13/viper"
)

type Config struct {
    App      AppConfig      `mapstructure:"app"`
    Database DatabaseConfig `mapstructure:"database"`
    Redis    RedisConfig    `mapstructure:"redis"`
    JWT      JWTConfig      `mapstructure:"jwt"`
    Log      LogConfig      `mapstructure:"log"`
    Storage  StorageConfig  `mapstructure:"storage"`
}

type AppConfig struct {
    Name    string `mapstructure:"name"`
    Version string `mapstructure:"version"`
    Env     string `mapstructure:"env"`
    Debug   bool   `mapstructure:"debug"`
    Port    int    `mapstructure:"port"`
}

type DatabaseConfig struct {
    Host            string `mapstructure:"host"`
    Port            int    `mapstructure:"port"`
    User            string `mapstructure:"user"`
    Password        string `mapstructure:"password"`
    Name            string `mapstructure:"name"`
    SSLMode         string `mapstructure:"ssl_mode"`
    MaxOpenConns    int    `mapstructure:"max_open_conns"`
    MaxIdleConns    int    `mapstructure:"max_idle_conns"`
    ConnMaxLifetime string `mapstructure:"conn_max_lifetime"`
}

// ... 其他配置结构

func Load() (*Config, error) {
    viper.SetConfigName("config")
    viper.SetConfigType("yaml")
    viper.AddConfigPath("./configs")
    viper.AddConfigPath(".")
    
    // 设置环境变量前缀
    viper.SetEnvPrefix("RUBICK")
    viper.AutomaticEnv()
    
    if err := viper.ReadInConfig(); err != nil {
        return nil, fmt.Errorf("error reading config file: %w", err)
    }
    
    var config Config
    if err := viper.Unmarshal(&config); err != nil {
        return nil, fmt.Errorf("error unmarshaling config: %w", err)
    }
    
    return &config, nil
}
```

## 应用程序入口

### Web 服务器

```go
// cmd/server/main.go
package main

import (
    "log"
    "rubick-backend/internal/config"
    "rubick-backend/internal/database"
    "rubick-backend/internal/handlers"
    "rubick-backend/internal/repositories"
    "rubick-backend/internal/services"
    "rubick-backend/api/v1"
    "rubick-backend/api/middleware"
    "github.com/gin-gonic/gin"
)

func main() {
    // 加载配置
    cfg, err := config.Load()
    if err != nil {
        log.Fatalf("Failed to load config: %v", err)
    }
    
    // 初始化数据库
    db, err := database.NewConnection(cfg.Database)
    if err != nil {
        log.Fatalf("Failed to connect to database: %v", err)
    }
    
    // 初始化仓库
    pluginRepo := repositories.NewPluginRepository(db)
    userRepo := repositories.NewUserRepository(db)
    
    // 初始化服务
    pluginService := services.NewPluginService(pluginRepo)
    userService := services.NewUserService(userRepo)
    
    // 初始化处理器
    pluginHandler := handlers.NewPluginHandler(pluginService)
    userHandler := handlers.NewUserHandler(userService)
    
    // 设置路由
    r := gin.Default()
    
    // 全局中间件
    r.Use(middleware.Logger())
    r.Use(middleware.Recovery())
    r.Use(middleware.CORS())
    
    // API 路由
    v1.RegisterPluginRoutes(r, pluginHandler)
    v1.RegisterUserRoutes(r, userHandler)
    
    // 启动服务器
    addr := fmt.Sprintf(":%d", cfg.App.Port)
    log.Printf("Starting server on %s", addr)
    
    if err := r.Run(addr); err != nil {
        log.Fatalf("Failed to start server: %v", err)
    }
}
```

### 数据库迁移

```go
// cmd/migrate/main.go
package main

import (
    "log"
    "rubick-backend/internal/config"
    "rubick-backend/internal/database"
    "github.com/golang-migrate/migrate/v4"
    _ "github.com/golang-migrate/migrate/v4/database/postgres"
    _ "github.com/golang-migrate/migrate/v4/source/file"
)

func main() {
    cfg, err := config.Load()
    if err != nil {
        log.Fatalf("Failed to load config: %v", err)
    }
    
    dbURL := fmt.Sprintf("postgres://%s:%s@%s:%d/%s?sslmode=%s",
        cfg.Database.User,
        cfg.Database.Password,
        cfg.Database.Host,
        cfg.Database.Port,
        cfg.Database.Name,
        cfg.Database.SSLMode,
    )
    
    m, err := migrate.New(
        "file://internal/database/migrations",
        dbURL,
    )
    if err != nil {
        log.Fatalf("Failed to create migrate instance: %v", err)
    }
    
    if err := m.Up(); err != nil && err != migrate.ErrNoChange {
        log.Fatalf("Failed to run migrations: %v", err)
    }
    
    log.Println("Migrations completed successfully")
}
```

## 开发工作流

### 添加新功能

1. **定义模型**：在 `internal/models/` 中创建数据模型
2. **创建仓库**：在 `internal/repositories/` 中实现数据访问
3. **实现服务**：在 `internal/services/` 中实现业务逻辑
4. **创建处理器**：在 `internal/handlers/` 中处理 HTTP 请求
5. **定义路由**：在 `api/v1/` 中注册路由
6. **编写测试**：在 `tests/` 中添加测试用例
7. **更新文档**：在 `docs/` 中更新 API 文档

### 代码组织原则

1. **依赖方向**：上层依赖下层，不能反向依赖
   - handlers → services → repositories → models
   - 不能在 repositories 中调用 services

2. **接口抽象**：在每一层之间使用接口解耦
   - services 定义接口，repositories 实现接口
   - handlers 定义接口，services 实现接口

3. **错误处理**：使用统一的错误处理机制
   - 在 `pkg/errors/` 中定义错误类型
   - 在每一层中统一处理错误

4. **配置管理**：使用统一的配置管理
   - 在 `internal/config/` 中定义配置结构
   - 使用环境变量覆盖配置文件

## 更多资源

- [Go 项目标准布局](https://github.com/golang-standards/project-layout)
- [GORM 文档](https://gorm.io/docs/)
- [Gin 框架文档](https://gin-gonic.com/docs/)
- [Viper 配置库](https://github.com/spf13/viper)