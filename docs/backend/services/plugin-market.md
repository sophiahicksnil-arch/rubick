# 插件市场服务

## 概述

插件市场服务是 Rubick 后端的核心组件之一，负责管理插件的发布、搜索、下载和评价等功能。

## 功能特性

- **插件管理**：插件的增删改查
- **版本管理**：插件版本控制和历史记录
- **搜索功能**：多维度插件搜索
- **评价系统**：插件评分和评论
- **下载统计**：插件下载次数统计
- **分类管理**：插件分类和标签管理
- **安全扫描**：插件安全性检查

## 数据模型

### 插件模型

```go
// internal/models/plugin.go
package models

import (
    "time"
    "gorm.io/gorm"
)

type Plugin struct {
    ID          string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
    Name        string    `gorm:"not null;size:255;index" json:"name"`
    DisplayName string    `gorm:"not null;size:255" json:"display_name"`
    Description string    `gorm:"type:text" json:"description"`
    Version     string    `gorm:"not null;size:50" json:"version"`
    Author      string    `gorm:"not null;size:255;index" json:"author"`
    AuthorEmail  string    `gorm:"size:255" json:"author_email"`
    Homepage    string    `gorm:"size:500" json:"homepage"`
    Repository  string    `gorm:"size:500" json:"repository"`
    License     string    `gorm:"size:100" json:"license"`
    Keywords    string    `gorm:"type:text" json:"keywords"`
    Category    string    `gorm:"not null;size:100;index" json:"category"`
    Tags        string    `gorm:"type:text" json:"tags"`
    Logo        string    `gorm:"size:500" json:"logo"`
    Screenshots string    `gorm:"type:text" json:"screenshots"`
    Readme      string    `gorm:"type:text" json:"readme"`
    Changelog   string    `gorm:"type:text" json:"changelog"`
    Downloads   int       `gorm:"default:0" json:"downloads"`
    Rating      float64   `gorm:"default:0" json:"rating"`
    RatingCount int       `gorm:"default:0" json:"rating_count"`
    IsActive    bool      `gorm:"default:true;index" json:"is_active"`
    IsFeatured  bool      `gorm:"default:false;index" json:"is_featured"`
    VerifiedAt  *time.Time `gorm:"index" json:"verified_at"`
    CreatedAt   time.Time `gorm:"autoCreateTime" json:"created_at"`
    UpdatedAt   time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (p *Plugin) BeforeCreate(tx *gorm.DB) error {
    if p.ID == "" {
        p.ID = generateUUID()
    }
    return nil
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
    if p.Category == "" {
        return errors.New("plugin category is required")
    }
    return nil
}
```

### 插件版本模型

```go
// internal/models/plugin_version.go
package models

import (
    "time"
    "gorm.io/gorm"
)

type PluginVersion struct {
    ID          string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
    PluginID    string    `gorm:"not null;type:uuid;index" json:"plugin_id"`
    Version     string    `gorm:"not null;size:50" json:"version"`
    Changelog   string    `gorm:"type:text" json:"changelog"`
    DownloadURL string    `gorm:"size:500" json:"download_url"`
    PackageSize int64     `gorm:"default:0" json:"package_size"`
    SHA256      string    `gorm:"size:64" json:"sha256"`
    IsPrerelease bool     `gorm:"default:false" json:"is_prerelease"`
    Downloads   int       `gorm:"default:0" json:"downloads"`
    CreatedAt   time.Time `gorm:"autoCreateTime" json:"created_at"`
    
    Plugin      Plugin   `gorm:"foreignKey:PluginID" json:"plugin,omitempty"`
}

func (pv *PluginVersion) BeforeCreate(tx *gorm.DB) error {
    if pv.ID == "" {
        pv.ID = generateUUID()
    }
    return nil
}
```

### 插件评价模型

```go
// internal/models/plugin_review.go
package models

import (
    "time"
    "gorm.io/gorm"
)

type PluginReview struct {
    ID        string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
    PluginID  string    `gorm:"not null;type:uuid;index" json:"plugin_id"`
    UserID    string    `gorm:"not null;type:uuid;index" json:"user_id"`
    Rating    int       `gorm:"not null;check:rating >= 1 AND rating <= 5" json:"rating"`
    Comment   string    `gorm:"type:text" json:"comment"`
    IsVisible bool      `gorm:"default:true" json:"is_visible"`
    CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
    UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updated_at"`
    
    Plugin Plugin `gorm:"foreignKey:PluginID" json:"plugin,omitempty"`
    User   User   `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (pr *PluginReview) BeforeCreate(tx *gorm.DB) error {
    if pr.ID == "" {
        pr.ID = generateUUID()
    }
    return nil
}
```

### 插件分类模型

```go
// internal/models/plugin_category.go
package models

import (
    "time"
    "gorm.io/gorm"
)

type PluginCategory struct {
    ID          string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
    Name        string    `gorm:"not null;size:100;uniqueIndex" json:"name"`
    DisplayName string    `gorm:"not null;size:255" json:"display_name"`
    Description string    `gorm:"type:text" json:"description"`
    Icon        string    `gorm:"size:500" json:"icon"`
    SortOrder   int       `gorm:"default:0" json:"sort_order"`
    IsActive    bool      `gorm:"default:true" json:"is_active"`
    CreatedAt   time.Time `gorm:"autoCreateTime" json:"created_at"`
    UpdatedAt   time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (pc *PluginCategory) BeforeCreate(tx *gorm.DB) error {
    if pc.ID == "" {
        pc.ID = generateUUID()
    }
    return nil
}
```

## 服务实现

### 插件服务接口

```go
// internal/services/interfaces.go
package services

import (
    "rubick-backend/internal/models"
)

type PluginService interface {
    // 插件管理
    ListPlugins(filter PluginFilter) (*PluginListResult, error)
    GetPlugin(id string) (*models.Plugin, error)
    GetPluginByName(name string) (*models.Plugin, error)
    CreatePlugin(plugin *models.Plugin) error
    UpdatePlugin(id string, plugin *models.Plugin) error
    DeletePlugin(id string) error
    
    // 版本管理
    ListPluginVersions(pluginID string) ([]*models.PluginVersion, error)
    GetPluginVersion(id string) (*models.PluginVersion, error)
    CreatePluginVersion(version *models.PluginVersion) error
    GetLatestVersion(pluginID string) (*models.PluginVersion, error)
    
    // 搜索功能
    SearchPlugins(query SearchQuery) (*PluginListResult, error)
    
    // 评价系统
    ListPluginReviews(pluginID string, filter ReviewFilter) (*ReviewListResult, error)
    CreatePluginReview(review *models.PluginReview) error
    UpdatePluginReview(id string, review *models.PluginReview) error
    DeletePluginReview(id string) error
    
    // 统计功能
    IncrementDownloads(pluginID string) error
    GetPluginStats(pluginID string) (*PluginStats, error)
    
    // 分类管理
    ListCategories() ([]*models.PluginCategory, error)
    GetCategory(id string) (*models.PluginCategory, error)
    CreateCategory(category *models.PluginCategory) error
    UpdateCategory(id string, category *models.PluginCategory) error
    DeleteCategory(id string) error
}

type PluginFilter struct {
    Category    string `json:"category"`
    Author      string `json:"author"`
    Tags        string `json:"tags"`
    IsActive    *bool  `json:"is_active"`
    IsFeatured  *bool  `json:"is_featured"`
    Page        int    `json:"page"`
    PageSize    int    `json:"page_size"`
    SortBy      string `json:"sort_by"`
    SortOrder   string `json:"sort_order"`
}

type SearchQuery struct {
    Query       string `json:"query"`
    Category    string `json:"category"`
    Author      string `json:"author"`
    Tags        string `json:"tags"`
    MinRating   float64 `json:"min_rating"`
    Page        int    `json:"page"`
    PageSize    int    `json:"page_size"`
}

type PluginListResult struct {
    Plugins    []*models.Plugin `json:"plugins"`
    Total      int64            `json:"total"`
    Page       int              `json:"page"`
    PageSize   int              `json:"page_size"`
    TotalPages int              `json:"total_pages"`
}

type ReviewFilter struct {
    UserID     string `json:"user_id"`
    Rating     *int   `json:"rating"`
    Page       int    `json:"page"`
    PageSize   int    `json:"page_size"`
    SortBy     string `json:"sort_by"`
    SortOrder  string `json:"sort_order"`
}

type ReviewListResult struct {
    Reviews    []*models.PluginReview `json:"reviews"`
    Total      int64                `json:"total"`
    Page       int                  `json:"page"`
    PageSize   int                  `json:"page_size"`
    TotalPages int                  `json:"total_pages"`
}

type PluginStats struct {
    Downloads     int64   `json:"downloads"`
    Rating       float64 `json:"rating"`
    RatingCount  int64   `json:"rating_count"`
    ReviewCount  int64   `json:"review_count"`
    CreatedAt    time.Time `json:"created_at"`
    UpdatedAt    time.Time `json:"updated_at"`
}
```

### 插件服务实现

```go
// internal/services/plugin.go
package services

import (
    "context"
    "errors"
    "fmt"
    "rubick-backend/internal/models"
    "rubick-backend/internal/repositories"
    "rubick-backend/pkg/logger"
    "github.com/google/uuid"
)

type pluginService struct {
    pluginRepo     repositories.PluginRepository
    versionRepo    repositories.PluginVersionRepository
    reviewRepo     repositories.PluginReviewRepository
    categoryRepo   repositories.PluginCategoryRepository
    searchService  SearchService
}

func NewPluginService(
    pluginRepo repositories.PluginRepository,
    versionRepo repositories.PluginVersionRepository,
    reviewRepo repositories.PluginReviewRepository,
    categoryRepo repositories.PluginCategoryRepository,
    searchService SearchService,
) PluginService {
    return &pluginService{
        pluginRepo:    pluginRepo,
        versionRepo:   versionRepo,
        reviewRepo:    reviewRepo,
        categoryRepo:  categoryRepo,
        searchService: searchService,
    }
}

func (s *pluginService) ListPlugins(filter PluginFilter) (*PluginListResult, error) {
    // 设置默认值
    if filter.Page <= 0 {
        filter.Page = 1
    }
    if filter.PageSize <= 0 {
        filter.PageSize = 20
    }
    
    // 计算偏移量
    offset := (filter.Page - 1) * filter.PageSize
    
    // 获取插件列表
    plugins, total, err := s.pluginRepo.List(filter, offset, filter.PageSize)
    if err != nil {
        logger.Error("Failed to list plugins", "error", err)
        return nil, fmt.Errorf("failed to list plugins: %w", err)
    }
    
    // 计算总页数
    totalPages := int((total + int64(filter.PageSize) - 1) / int64(filter.PageSize))
    
    return &PluginListResult{
        Plugins:    plugins,
        Total:      total,
        Page:       filter.Page,
        PageSize:   filter.PageSize,
        TotalPages: totalPages,
    }, nil
}

func (s *pluginService) GetPlugin(id string) (*models.Plugin, error) {
    plugin, err := s.pluginRepo.GetByID(id)
    if err != nil {
        logger.Error("Failed to get plugin", "id", id, "error", err)
        return nil, fmt.Errorf("failed to get plugin: %w", err)
    }
    
    if plugin == nil {
        return nil, errors.New("plugin not found")
    }
    
    return plugin, nil
}

func (s *pluginService) GetPluginByName(name string) (*models.Plugin, error) {
    plugin, err := s.pluginRepo.GetByName(name)
    if err != nil {
        logger.Error("Failed to get plugin by name", "name", name, "error", err)
        return nil, fmt.Errorf("failed to get plugin by name: %w", err)
    }
    
    if plugin == nil {
        return nil, errors.New("plugin not found")
    }
    
    return plugin, nil
}

func (s *pluginService) CreatePlugin(plugin *models.Plugin) error {
    // 验证插件数据
    if err := plugin.Validate(); err != nil {
        return fmt.Errorf("invalid plugin data: %w", err)
    }
    
    // 检查插件名称是否已存在
    existingPlugin, err := s.pluginRepo.GetByName(plugin.Name)
    if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
        return fmt.Errorf("failed to check plugin existence: %w", err)
    }
    if existingPlugin != nil {
        return errors.New("plugin with this name already exists")
    }
    
    // 创建插件
    if err := s.pluginRepo.Create(plugin); err != nil {
        logger.Error("Failed to create plugin", "name", plugin.Name, "error", err)
        return fmt.Errorf("failed to create plugin: %w", err)
    }
    
    // 索引到搜索引擎
    if err := s.searchService.IndexPlugin(plugin); err != nil {
        logger.Error("Failed to index plugin", "id", plugin.ID, "error", err)
        // 不返回错误，因为插件已经创建成功
    }
    
    logger.Info("Plugin created successfully", "id", plugin.ID, "name", plugin.Name)
    return nil
}

func (s *pluginService) UpdatePlugin(id string, plugin *models.Plugin) error {
    // 验证插件数据
    if err := plugin.Validate(); err != nil {
        return fmt.Errorf("invalid plugin data: %w", err)
    }
    
    // 检查插件是否存在
    existingPlugin, err := s.pluginRepo.GetByID(id)
    if err != nil {
        return fmt.Errorf("failed to get plugin: %w", err)
    }
    if existingPlugin == nil {
        return errors.New("plugin not found")
    }
    
    // 检查名称冲突（如果名称有变化）
    if existingPlugin.Name != plugin.Name {
        nameConflict, err := s.pluginRepo.GetByName(plugin.Name)
        if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
            return fmt.Errorf("failed to check plugin existence: %w", err)
        }
        if nameConflict != nil && nameConflict.ID != id {
            return errors.New("plugin with this name already exists")
        }
    }
    
    // 更新插件
    plugin.ID = id
    if err := s.pluginRepo.Update(plugin); err != nil {
        logger.Error("Failed to update plugin", "id", id, "error", err)
        return fmt.Errorf("failed to update plugin: %w", err)
    }
    
    // 更新搜索引擎索引
    if err := s.searchService.UpdatePlugin(plugin); err != nil {
        logger.Error("Failed to update plugin index", "id", id, "error", err)
        // 不返回错误，因为插件已经更新成功
    }
    
    logger.Info("Plugin updated successfully", "id", id, "name", plugin.Name)
    return nil
}

func (s *pluginService) DeletePlugin(id string) error {
    // 检查插件是否存在
    plugin, err := s.pluginRepo.GetByID(id)
    if err != nil {
        return fmt.Errorf("failed to get plugin: %w", err)
    }
    if plugin == nil {
        return errors.New("plugin not found")
    }
    
    // 删除相关数据
    if err := s.versionRepo.DeleteByPluginID(id); err != nil {
        logger.Error("Failed to delete plugin versions", "plugin_id", id, "error", err)
        return fmt.Errorf("failed to delete plugin versions: %w", err)
    }
    
    if err := s.reviewRepo.DeleteByPluginID(id); err != nil {
        logger.Error("Failed to delete plugin reviews", "plugin_id", id, "error", err)
        return fmt.Errorf("failed to delete plugin reviews: %w", err)
    }
    
    // 删除插件
    if err := s.pluginRepo.Delete(id); err != nil {
        logger.Error("Failed to delete plugin", "id", id, "error", err)
        return fmt.Errorf("failed to delete plugin: %w", err)
    }
    
    // 从搜索引擎中删除
    if err := s.searchService.DeletePlugin(id); err != nil {
        logger.Error("Failed to delete plugin from search index", "id", id, "error", err)
        // 不返回错误，因为插件已经删除成功
    }
    
    logger.Info("Plugin deleted successfully", "id", id, "name", plugin.Name)
    return nil
}

func (s *pluginService) SearchPlugins(query SearchQuery) (*PluginListResult, error) {
    // 设置默认值
    if query.Page <= 0 {
        query.Page = 1
    }
    if query.PageSize <= 0 {
        query.PageSize = 20
    }
    
    // 搜索插件
    result, err := s.searchService.SearchPlugins(query)
    if err != nil {
        logger.Error("Failed to search plugins", "query", query, "error", err)
        return nil, fmt.Errorf("failed to search plugins: %w", err)
    }
    
    return result, nil
}

func (s *pluginService) IncrementDownloads(pluginID string) error {
    return s.pluginRepo.IncrementDownloads(pluginID)
}

func (s *pluginService) GetPluginStats(pluginID string) (*PluginStats, error) {
    plugin, err := s.pluginRepo.GetByID(pluginID)
    if err != nil {
        return nil, fmt.Errorf("failed to get plugin: %w", err)
    }
    
    if plugin == nil {
        return nil, errors.New("plugin not found")
    }
    
    reviewStats, err := s.reviewRepo.GetStats(pluginID)
    if err != nil {
        return nil, fmt.Errorf("failed to get review stats: %w", err)
    }
    
    return &PluginStats{
        Downloads:    int64(plugin.Downloads),
        Rating:       plugin.Rating,
        RatingCount:  int64(plugin.RatingCount),
        ReviewCount:  reviewStats.Count,
        CreatedAt:    plugin.CreatedAt,
        UpdatedAt:    plugin.UpdatedAt,
    }, nil
}

// ... 其他方法实现
```

## API 处理器

### 插件处理器

```go
// internal/handlers/plugin.go
package handlers

import (
    "net/http"
    "rubick-backend/internal/services"
    "rubick-backend/pkg/response"
    "github.com/gin-gonic/gin"
)

type PluginHandler struct {
    pluginService services.PluginService
}

func NewPluginHandler(pluginService services.PluginService) *PluginHandler {
    return &PluginHandler{
        pluginService: pluginService,
    }
}

type ListPluginsRequest struct {
    Category   string `form:"category"`
    Author     string `form:"author"`
    Tags       string `form:"tags"`
    IsActive   *bool  `form:"is_active"`
    IsFeatured *bool  `form:"is_featured"`
    Page       int    `form:"page,default=1"`
    PageSize   int    `form:"page_size,default=20"`
    SortBy     string `form:"sort_by,default=created_at"`
    SortOrder  string `form:"sort_order,default=desc"`
}

type SearchPluginsRequest struct {
    Query     string  `form:"q"`
    Category  string  `form:"category"`
    Author    string  `form:"author"`
    Tags      string  `form:"tags"`
    MinRating float64 `form:"min_rating"`
    Page      int     `form:"page,default=1"`
    PageSize  int     `form:"page_size,default=20"`
}

func (h *PluginHandler) ListPlugins(c *gin.Context) {
    var req ListPluginsRequest
    if err := c.ShouldBindQuery(&req); err != nil {
        response.Error(c, http.StatusBadRequest, "Invalid request parameters", err)
        return
    }
    
    filter := services.PluginFilter{
        Category:   req.Category,
        Author:     req.Author,
        Tags:       req.Tags,
        IsActive:   req.IsActive,
        IsFeatured: req.IsFeatured,
        Page:       req.Page,
        PageSize:   req.PageSize,
        SortBy:     req.SortBy,
        SortOrder:  req.SortOrder,
    }
    
    result, err := h.pluginService.ListPlugins(filter)
    if err != nil {
        response.Error(c, http.StatusInternalServerError, "Failed to list plugins", err)
        return
    }
    
    response.Success(c, result)
}

func (h *PluginHandler) GetPlugin(c *gin.Context) {
    id := c.Param("id")
    if id == "" {
        response.Error(c, http.StatusBadRequest, "Plugin ID is required", nil)
        return
    }
    
    plugin, err := h.pluginService.GetPlugin(id)
    if err != nil {
        response.Error(c, http.StatusInternalServerError, "Failed to get plugin", err)
        return
    }
    
    response.Success(c, plugin)
}

func (h *PluginHandler) CreatePlugin(c *gin.Context) {
    var req models.Plugin
    if err := c.ShouldBindJSON(&req); err != nil {
        response.Error(c, http.StatusBadRequest, "Invalid request body", err)
        return
    }
    
    if err := h.pluginService.CreatePlugin(&req); err != nil {
        response.Error(c, http.StatusInternalServerError, "Failed to create plugin", err)
        return
    }
    
    response.Success(c, gin.H{"id": req.ID})
}

func (h *PluginHandler) UpdatePlugin(c *gin.Context) {
    id := c.Param("id")
    if id == "" {
        response.Error(c, http.StatusBadRequest, "Plugin ID is required", nil)
        return
    }
    
    var req models.Plugin
    if err := c.ShouldBindJSON(&req); err != nil {
        response.Error(c, http.StatusBadRequest, "Invalid request body", err)
        return
    }
    
    if err := h.pluginService.UpdatePlugin(id, &req); err != nil {
        response.Error(c, http.StatusInternalServerError, "Failed to update plugin", err)
        return
    }
    
    response.Success(c, gin.H{"id": id})
}

func (h *PluginHandler) DeletePlugin(c *gin.Context) {
    id := c.Param("id")
    if id == "" {
        response.Error(c, http.StatusBadRequest, "Plugin ID is required", nil)
        return
    }
    
    if err := h.pluginService.DeletePlugin(id); err != nil {
        response.Error(c, http.StatusInternalServerError, "Failed to delete plugin", err)
        return
    }
    
    response.Success(c, gin.H{"id": id})
}

func (h *PluginHandler) SearchPlugins(c *gin.Context) {
    var req SearchPluginsRequest
    if err := c.ShouldBindQuery(&req); err != nil {
        response.Error(c, http.StatusBadRequest, "Invalid request parameters", err)
        return
    }
    
    query := services.SearchQuery{
        Query:     req.Query,
        Category:  req.Category,
        Author:    req.Author,
        Tags:      req.Tags,
        MinRating: req.MinRating,
        Page:      req.Page,
        PageSize:  req.PageSize,
    }
    
    result, err := h.pluginService.SearchPlugins(query)
    if err != nil {
        response.Error(c, http.StatusInternalServerError, "Failed to search plugins", err)
        return
    }
    
    response.Success(c, result)
}

func (h *PluginHandler) GetPluginStats(c *gin.Context) {
    id := c.Param("id")
    if id == "" {
        response.Error(c, http.StatusBadRequest, "Plugin ID is required", nil)
        return
    }
    
    stats, err := h.pluginService.GetPluginStats(id)
    if err != nil {
        response.Error(c, http.StatusInternalServerError, "Failed to get plugin stats", err)
        return
    }
    
    response.Success(c, stats)
}

func (h *PluginHandler) DownloadPlugin(c *gin.Context) {
    id := c.Param("id")
    if id == "" {
        response.Error(c, http.StatusBadRequest, "Plugin ID is required", nil)
        return
    }
    
    // 增加下载次数
    if err := h.pluginService.IncrementDownloads(id); err != nil {
        response.Error(c, http.StatusInternalServerError, "Failed to increment downloads", err)
        return
    }
    
    // 获取最新版本信息
    version, err := h.pluginService.GetLatestVersion(id)
    if err != nil {
        response.Error(c, http.StatusInternalServerError, "Failed to get plugin version", err)
        return
    }
    
    response.Success(c, gin.H{
        "download_url": version.DownloadURL,
        "version":     version.Version,
        "package_size": version.PackageSize,
        "sha256":      version.SHA256,
    })
}
```

## 路由注册

```go
// api/v1/plugin.go
package v1

import (
    "rubick-backend/api/middleware"
    "rubick-backend/internal/handlers"
    "github.com/gin-gonic/gin"
)

func RegisterPluginRoutes(r *gin.Engine, h *handlers.PluginHandler) {
    v1 := r.Group("/api/v1")
    {
        plugins := v1.Group("/plugins")
        {
            plugins.GET("", h.ListPlugins)
            plugins.GET("/search", h.SearchPlugins)
            plugins.GET("/:id", h.GetPlugin)
            plugins.GET("/:id/stats", h.GetPluginStats)
            plugins.GET("/:id/download", h.DownloadPlugin)
            
            // 需要认证的路由
            authenticated := plugins.Group("")
            authenticated.Use(middleware.AuthMiddleware())
            {
                authenticated.POST("", h.CreatePlugin)
                authenticated.PUT("/:id", h.UpdatePlugin)
                authenticated.DELETE("/:id", h.DeletePlugin)
            }
        }
        
        categories := v1.Group("/categories")
        {
            categories.GET("", h.ListCategories)
            categories.GET("/:id", h.GetCategory)
            
            // 需要认证的路由
            authenticated := categories.Group("")
            authenticated.Use(middleware.AuthMiddleware())
            {
                authenticated.POST("", h.CreateCategory)
                authenticated.PUT("/:id", h.UpdateCategory)
                authenticated.DELETE("/:id", h.DeleteCategory)
            }
        }
    }
}
```

## 搜索引擎集成

### Elasticsearch 集成

```go
// internal/services/search.go
package services

import (
    "bytes"
    "context"
    "encoding/json"
    "fmt"
    "rubick-backend/internal/models"
    "rubick-backend/pkg/logger"
    "github.com/elastic/go-elasticsearch/v8"
)

type SearchService interface {
    IndexPlugin(plugin *models.Plugin) error
    UpdatePlugin(plugin *models.Plugin) error
    DeletePlugin(id string) error
    SearchPlugins(query SearchQuery) (*PluginListResult, error)
}

type elasticsearchService struct {
    client *elasticsearch.Client
    index  string
}

func NewElasticsearchService(client *elasticsearch.Client) SearchService {
    return &elasticsearchService{
        client: client,
        index:  "rubick_plugins",
    }
}

func (s *elasticsearchService) IndexPlugin(plugin *models.Plugin) error {
    doc := map[string]interface{}{
        "id":           plugin.ID,
        "name":         plugin.Name,
        "display_name":  plugin.DisplayName,
        "description":  plugin.Description,
        "version":      plugin.Version,
        "author":       plugin.Author,
        "category":     plugin.Category,
        "tags":         plugin.Tags,
        "downloads":    plugin.Downloads,
        "rating":       plugin.Rating,
        "is_active":    plugin.IsActive,
        "is_featured":  plugin.IsFeatured,
        "created_at":   plugin.CreatedAt,
        "updated_at":   plugin.UpdatedAt,
    }
    
    data, err := json.Marshal(doc)
    if err != nil {
        return fmt.Errorf("failed to marshal plugin: %w", err)
    }
    
    req := elasticsearch.IndexRequest{
        Index:      s.index,
        DocumentID: plugin.ID,
        Body:       bytes.NewReader(data),
        Refresh:    "true",
    }
    
    _, err = s.client.Index(req)
    if err != nil {
        logger.Error("Failed to index plugin", "id", plugin.ID, "error", err)
        return fmt.Errorf("failed to index plugin: %w", err)
    }
    
    return nil
}

func (s *elasticsearchService) SearchPlugins(query SearchQuery) (*PluginListResult, error) {
    // 构建搜索查询
    searchQuery := s.buildSearchQuery(query)
    
    req := elasticsearch.SearchRequest{
        Index: []string{s.index},
        Body:  searchQuery,
    }
    
    res, err := s.client.Search(req)
    if err != nil {
        logger.Error("Failed to search plugins", "query", query, "error", err)
        return nil, fmt.Errorf("failed to search plugins: %w", err)
    }
    
    return s.parseSearchResult(res, query)
}

func (s *elasticsearchService) buildSearchQuery(query SearchQuery) map[string]interface{} {
    must := []map[string]interface{}{}
    
    // 文本搜索
    if query.Query != "" {
        must = append(must, map[string]interface{}{
            "multi_match": map[string]interface{}{
                "query":  query.Query,
                "fields": []string{"name^3", "display_name^2", "description", "tags", "author"},
            },
        })
    }
    
    // 分类过滤
    if query.Category != "" {
        must = append(must, map[string]interface{}{
            "term": map[string]interface{}{
                "category": query.Category,
            },
        })
    }
    
    // 作者过滤
    if query.Author != "" {
        must = append(must, map[string]interface{}{
            "term": map[string]interface{}{
                "author": query.Author,
            },
        })
    }
    
    // 评分过滤
    if query.MinRating > 0 {
        must = append(must, map[string]interface{}{
            "range": map[string]interface{}{
                "rating": map[string]interface{}{
                    "gte": query.MinRating,
                },
            },
        })
    }
    
    // 只搜索活跃插件
    must = append(must, map[string]interface{}{
        "term": map[string]interface{}{
            "is_active": true,
        },
    })
    
    // 构建完整查询
    searchQuery := map[string]interface{}{
        "query": map[string]interface{}{
            "bool": map[string]interface{}{
                "must": must,
            },
        },
        "from": (query.Page - 1) * query.PageSize,
        "size": query.PageSize,
    }
    
    // 排序
    if query.SortBy != "" {
        searchQuery["sort"] = []map[string]interface{}{
            {
                query.SortBy: map[string]interface{}{
                    "order": query.SortOrder,
                },
            },
        }
    } else {
        // 默认按评分和下载量排序
        searchQuery["sort"] = []map[string]interface{}{
            {
                "rating": map[string]interface{}{
                    "order": "desc",
                },
            },
            {
                "downloads": map[string]interface{}{
                    "order": "desc",
                },
            },
        }
    }
    
    return searchQuery
}

func (s *elasticsearchService) parseSearchResult(res *elasticsearch.Response, query SearchQuery) (*PluginListResult, error) {
    var result struct {
        Hits struct {
            Total struct {
                Value int64 `json:"value"`
            } `json:"total"`
            Hits []struct {
                Source *models.Plugin `json:"_source"`
            } `json:"hits"`
        } `json:"hits"`
    }
    
    if err := json.NewDecoder(res.Body).Decode(&result); err != nil {
        return nil, fmt.Errorf("failed to decode search result: %w", err)
    }
    
    plugins := make([]*models.Plugin, len(result.Hits.Hits))
    for i, hit := range result.Hits.Hits {
        plugins[i] = hit.Source
    }
    
    totalPages := int((result.Hits.Total.Value + int64(query.PageSize) - 1) / int64(query.PageSize))
    
    return &PluginListResult{
        Plugins:    plugins,
        Total:      result.Hits.Total.Value,
        Page:       query.Page,
        PageSize:   query.PageSize,
        TotalPages: totalPages,
    }, nil
}
```

## 性能优化

### 缓存策略

```go
// internal/services/plugin_cache.go
package services

import (
    "context"
    "encoding/json"
    "fmt"
    "rubick-backend/internal/models"
    "rubick-backend/pkg/logger"
    "time"
    "github.com/go-redis/redis/v8"
)

type PluginCacheService struct {
    pluginService PluginService
    redisClient  *redis.Client
}

func NewPluginCacheService(pluginService PluginService, redisClient *redis.Client) PluginService {
    return &PluginCacheService{
        pluginService: pluginService,
        redisClient:  redisClient,
    }
}

func (s *PluginCacheService) ListPlugins(filter PluginFilter) (*PluginListResult, error) {
    // 生成缓存键
    cacheKey := s.generateCacheKey("plugins", filter)
    
    // 尝试从缓存获取
    cached, err := s.redisClient.Get(context.Background(), cacheKey).Result()
    if err == nil {
        var result PluginListResult
        if err := json.Unmarshal([]byte(cached), &result); err == nil {
            logger.Debug("Cache hit for plugin list", "key", cacheKey)
            return &result, nil
        }
    }
    
    // 缓存未命中，从数据库获取
    result, err := s.pluginService.ListPlugins(filter)
    if err != nil {
        return nil, err
    }
    
    // 缓存结果
    data, err := json.Marshal(result)
    if err != nil {
        logger.Error("Failed to marshal plugin list", "error", err)
        return result, nil // 不返回错误，因为数据已经获取成功
    }
    
    // 设置缓存，过期时间 5 分钟
    if err := s.redisClient.Set(context.Background(), cacheKey, data, 5*time.Minute).Err(); err != nil {
        logger.Error("Failed to cache plugin list", "key", cacheKey, "error", err)
    }
    
    return result, nil
}

func (s *PluginCacheService) GetPlugin(id string) (*models.Plugin, error) {
    // 生成缓存键
    cacheKey := fmt.Sprintf("plugin:%s", id)
    
    // 尝试从缓存获取
    cached, err := s.redisClient.Get(context.Background(), cacheKey).Result()
    if err == nil {
        var plugin models.Plugin
        if err := json.Unmarshal([]byte(cached), &plugin); err == nil {
            logger.Debug("Cache hit for plugin", "id", id, "key", cacheKey)
            return &plugin, nil
        }
    }
    
    // 缓存未命中，从数据库获取
    plugin, err := s.pluginService.GetPlugin(id)
    if err != nil {
        return nil, err
    }
    
    // 缓存结果
    data, err := json.Marshal(plugin)
    if err != nil {
        logger.Error("Failed to marshal plugin", "id", id, "error", err)
        return plugin, nil // 不返回错误，因为数据已经获取成功
    }
    
    // 设置缓存，过期时间 10 分钟
    if err := s.redisClient.Set(context.Background(), cacheKey, data, 10*time.Minute).Err(); err != nil {
        logger.Error("Failed to cache plugin", "id", id, "key", cacheKey, "error", err)
    }
    
    return plugin, nil
}

func (s *PluginCacheService) CreatePlugin(plugin *models.Plugin) error {
    // 创建插件
    if err := s.pluginService.CreatePlugin(plugin); err != nil {
        return err
    }
    
    // 清除相关缓存
    s.clearPluginCache()
    
    return nil
}

func (s *PluginCacheService) UpdatePlugin(id string, plugin *models.Plugin) error {
    // 更新插件
    if err := s.pluginService.UpdatePlugin(id, plugin); err != nil {
        return err
    }
    
    // 清除相关缓存
    s.clearPluginCache()
    
    // 清除特定插件缓存
    cacheKey := fmt.Sprintf("plugin:%s", id)
    if err := s.redisClient.Del(context.Background(), cacheKey).Err(); err != nil {
        logger.Error("Failed to clear plugin cache", "id", id, "key", cacheKey, "error", err)
    }
    
    return nil
}

func (s *PluginCacheService) DeletePlugin(id string) error {
    // 删除插件
    if err := s.pluginService.DeletePlugin(id); err != nil {
        return err
    }
    
    // 清除相关缓存
    s.clearPluginCache()
    
    // 清除特定插件缓存
    cacheKey := fmt.Sprintf("plugin:%s", id)
    if err := s.redisClient.Del(context.Background(), cacheKey).Err(); err != nil {
        logger.Error("Failed to clear plugin cache", "id", id, "key", cacheKey, "error", err)
    }
    
    return nil
}

func (s *PluginCacheService) generateCacheKey(prefix string, filter interface{}) string {
    data, _ := json.Marshal(filter)
    return fmt.Sprintf("%s:%s", prefix, string(data))
}

func (s *PluginCacheService) clearPluginCache() {
    // 清除插件列表缓存
    pattern := "plugins:*"
    keys, err := s.redisClient.Keys(context.Background(), pattern).Result()
    if err != nil {
        logger.Error("Failed to get plugin cache keys", "pattern", pattern, "error", err)
        return
    }
    
    if len(keys) > 0 {
        if err := s.redisClient.Del(context.Background(), keys...).Err(); err != nil {
            logger.Error("Failed to clear plugin cache", "keys", keys, "error", err)
        }
    }
}
```

## 更多资源

- [Elasticsearch 文档](https://www.elastic.co/guide/)
- [Redis 文档](https://redis.io/documentation)
- [GORM 文档](https://gorm.io/docs/)
- [Gin 框架文档](https://gin-gonic.com/docs/)