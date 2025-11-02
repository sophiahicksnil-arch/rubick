# RESTful API 文档

## 概述

Rubick 后端提供 RESTful API 接口，支持插件管理、用户认证、数据同步等功能。API 遵循 REST 设计原则，使用 JSON 格式进行数据交换。

## 基础信息

- **Base URL**: `https://api.rubick.com/api/v1`
- **协议**: HTTPS
- **数据格式**: JSON
- **字符编码**: UTF-8
- **API 版本**: v1

## 认证方式

### JWT Token 认证

大部分 API 需要使用 JWT Token 进行认证：

```http
Authorization: Bearer <your-jwt-token>
```

### 获取 Token

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

响应：
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_at": "2023-01-01T00:00:00Z",
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "name": "User Name"
    }
  }
}
```

## 通用响应格式

### 成功响应

```json
{
  "success": true,
  "data": {
    // 响应数据
  },
  "message": "操作成功"
}
```

### 错误响应

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": {}
  }
}
```

### 分页响应

```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 100,
      "total_pages": 5
    }
  }
}
```

## 插件 API

### 获取插件列表

```http
GET /api/v1/plugins
```

查询参数：

| 参数 | 类型 | 必需 | 默认值 | 描述 |
|------|------|--------|--------|------|
| category | string | 否 | - | 插件分类 |
| author | string | 否 | - | 插件作者 |
| tags | string | 否 | - | 插件标签 |
| is_active | boolean | 否 | true | 是否激活 |
| is_featured | boolean | 否 | false | 是否推荐 |
| page | integer | 否 | 1 | 页码 |
| page_size | integer | 否 | 20 | 每页数量 |
| sort_by | string | 否 | created_at | 排序字段 |
| sort_order | string | 否 | desc | 排序方向 |

响应示例：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "plugin-id",
        "name": "example-plugin",
        "display_name": "Example Plugin",
        "description": "这是一个示例插件",
        "version": "1.0.0",
        "author": "Example Author",
        "author_email": "author@example.com",
        "homepage": "https://example.com",
        "repository": "https://github.com/example/plugin",
        "license": "MIT",
        "keywords": "rubick,plugin,example",
        "category": "utility",
        "tags": "utility,example",
        "logo": "https://cdn.example.com/logo.png",
        "screenshots": "https://cdn.example.com/screenshot.png",
        "downloads": 1000,
        "rating": 4.5,
        "rating_count": 100,
        "is_active": true,
        "is_featured": false,
        "created_at": "2023-01-01T00:00:00Z",
        "updated_at": "2023-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 100,
      "total_pages": 5
    }
  }
}
```

### 获取插件详情

```http
GET /api/v1/plugins/{id}
```

路径参数：

| 参数 | 类型 | 必需 | 描述 |
|------|------|--------|------|
| id | string | 是 | 插件 ID |

响应示例：
```json
{
  "success": true,
  "data": {
    "id": "plugin-id",
    "name": "example-plugin",
    "display_name": "Example Plugin",
    "description": "这是一个示例插件",
    "version": "1.0.0",
    "author": "Example Author",
    "author_email": "author@example.com",
    "homepage": "https://example.com",
    "repository": "https://github.com/example/plugin",
    "license": "MIT",
    "keywords": "rubick,plugin,example",
    "category": "utility",
    "tags": "utility,example",
    "logo": "https://cdn.example.com/logo.png",
    "screenshots": "https://cdn.example.com/screenshot.png",
    "readme": "# Plugin README\n\nThis is an example plugin...",
    "changelog": "# Changelog\n\n## 1.0.0\n- Initial release",
    "downloads": 1000,
    "rating": 4.5,
    "rating_count": 100,
    "is_active": true,
    "is_featured": false,
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z",
    "versions": [
      {
        "id": "version-id",
        "version": "1.0.0",
        "changelog": "## 1.0.0\n- Initial release",
        "download_url": "https://cdn.example.com/plugin-1.0.0.tgz",
        "package_size": 1024000,
        "sha256": "sha256-hash",
        "is_prerelease": false,
        "downloads": 1000,
        "created_at": "2023-01-01T00:00:00Z"
      }
    ],
    "reviews": [
      {
        "id": "review-id",
        "user": {
          "id": "user-id",
          "name": "User Name",
          "avatar": "https://cdn.example.com/avatar.png"
        },
        "rating": 5,
        "comment": "Great plugin!",
        "created_at": "2023-01-01T00:00:00Z"
      }
    ]
  }
}
```

### 创建插件

```http
POST /api/v1/plugins
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "name": "example-plugin",
  "display_name": "Example Plugin",
  "description": "这是一个示例插件",
  "version": "1.0.0",
  "author": "Example Author",
  "author_email": "author@example.com",
  "homepage": "https://example.com",
  "repository": "https://github.com/example/plugin",
  "license": "MIT",
  "keywords": "rubick,plugin,example",
  "category": "utility",
  "tags": "utility,example",
  "logo": "https://cdn.example.com/logo.png",
  "screenshots": "https://cdn.example.com/screenshot.png",
  "readme": "# Plugin README\n\nThis is an example plugin...",
  "changelog": "# Changelog\n\n## 1.0.0\n- Initial release"
}
```

响应示例：
```json
{
  "success": true,
  "data": {
    "id": "new-plugin-id"
  },
  "message": "插件创建成功"
}
```

### 更新插件

```http
PUT /api/v1/plugins/{id}
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "display_name": "Updated Plugin Name",
  "description": "更新后的插件描述"
}
```

响应示例：
```json
{
  "success": true,
  "data": {
    "id": "plugin-id"
  },
  "message": "插件更新成功"
}
```

### 删除插件

```http
DELETE /api/v1/plugins/{id}
Authorization: Bearer <your-jwt-token>
```

响应示例：
```json
{
  "success": true,
  "data": {
    "id": "plugin-id"
  },
  "message": "插件删除成功"
}
```

### 搜索插件

```http
GET /api/v1/plugins/search
```

查询参数：

| 参数 | 类型 | 必需 | 默认值 | 描述 |
|------|------|--------|--------|------|
| q | string | 是 | - | 搜索关键词 |
| category | string | 否 | - | 插件分类 |
| author | string | 否 | - | 插件作者 |
| tags | string | 否 | - | 插件标签 |
| min_rating | float | 否 | 0 | 最低评分 |
| page | integer | 否 | 1 | 页码 |
| page_size | integer | 否 | 20 | 每页数量 |

响应示例：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "plugin-id",
        "name": "example-plugin",
        "display_name": "Example Plugin",
        "description": "这是一个示例插件",
        "version": "1.0.0",
        "author": "Example Author",
        "category": "utility",
        "downloads": 1000,
        "rating": 4.5,
        "rating_count": 100,
        "is_active": true,
        "is_featured": false,
        "created_at": "2023-01-01T00:00:00Z",
        "updated_at": "2023-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 50,
      "total_pages": 3
    }
  }
}
```

### 下载插件

```http
GET /api/v1/plugins/{id}/download
```

响应示例：
```json
{
  "success": true,
  "data": {
    "download_url": "https://cdn.example.com/plugin-1.0.0.tgz",
    "version": "1.0.0",
    "package_size": 1024000,
    "sha256": "sha256-hash"
  }
}
```

### 获取插件统计

```http
GET /api/v1/plugins/{id}/stats
```

响应示例：
```json
{
  "success": true,
  "data": {
    "downloads": 1000,
    "rating": 4.5,
    "rating_count": 100,
    "review_count": 50,
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z"
  }
}
```

## 插件版本 API

### 获取插件版本列表

```http
GET /api/v1/plugins/{id}/versions
```

响应示例：
```json
{
  "success": true,
  "data": [
    {
      "id": "version-id",
      "plugin_id": "plugin-id",
      "version": "1.0.0",
      "changelog": "## 1.0.0\n- Initial release",
      "download_url": "https://cdn.example.com/plugin-1.0.0.tgz",
      "package_size": 1024000,
      "sha256": "sha256-hash",
      "is_prerelease": false,
      "downloads": 1000,
      "created_at": "2023-01-01T00:00:00Z"
    }
  ]
}
```

### 获取插件版本详情

```http
GET /api/v1/plugins/versions/{id}
```

响应示例：
```json
{
  "success": true,
  "data": {
    "id": "version-id",
    "plugin_id": "plugin-id",
    "version": "1.0.0",
    "changelog": "## 1.0.0\n- Initial release",
    "download_url": "https://cdn.example.com/plugin-1.0.0.tgz",
    "package_size": 1024000,
    "sha256": "sha256-hash",
    "is_prerelease": false,
    "downloads": 1000,
    "created_at": "2023-01-01T00:00:00Z"
  }
}
```

### 创建插件版本

```http
POST /api/v1/plugins/{id}/versions
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "version": "1.1.0",
  "changelog": "## 1.1.0\n- Add new feature\n- Fix bug",
  "download_url": "https://cdn.example.com/plugin-1.1.0.tgz",
  "package_size": 1024000,
  "sha256": "sha256-hash",
  "is_prerelease": false
}
```

响应示例：
```json
{
  "success": true,
  "data": {
    "id": "new-version-id"
  },
  "message": "插件版本创建成功"
}
```

## 插件评价 API

### 获取插件评价列表

```http
GET /api/v1/plugins/{id}/reviews
```

查询参数：

| 参数 | 类型 | 必需 | 默认值 | 描述 |
|------|------|--------|--------|------|
| user_id | string | 否 | - | 用户 ID |
| rating | integer | 否 | - | 评分 |
| page | integer | 否 | 1 | 页码 |
| page_size | integer | 否 | 20 | 每页数量 |
| sort_by | string | 否 | created_at | 排序字段 |
| sort_order | string | 否 | desc | 排序方向 |

响应示例：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "review-id",
        "plugin_id": "plugin-id",
        "user": {
          "id": "user-id",
          "name": "User Name",
          "avatar": "https://cdn.example.com/avatar.png"
        },
        "rating": 5,
        "comment": "Great plugin!",
        "is_visible": true,
        "created_at": "2023-01-01T00:00:00Z",
        "updated_at": "2023-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 50,
      "total_pages": 3
    }
  }
}
```

### 创建插件评价

```http
POST /api/v1/plugins/{id}/reviews
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "rating": 5,
  "comment": "Great plugin!"
}
```

响应示例：
```json
{
  "success": true,
  "data": {
    "id": "new-review-id"
  },
  "message": "评价创建成功"
}
```

### 更新插件评价

```http
PUT /api/v1/plugins/reviews/{id}
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "rating": 4,
  "comment": "Updated review"
}
```

响应示例：
```json
{
  "success": true,
  "data": {
    "id": "review-id"
  },
  "message": "评价更新成功"
}
```

### 删除插件评价

```http
DELETE /api/v1/plugins/reviews/{id}
Authorization: Bearer <your-jwt-token>
```

响应示例：
```json
{
  "success": true,
  "data": {
    "id": "review-id"
  },
  "message": "评价删除成功"
}
```

## 插件分类 API

### 获取分类列表

```http
GET /api/v1/categories
```

响应示例：
```json
{
  "success": true,
  "data": [
    {
      "id": "category-id",
      "name": "utility",
      "display_name": "实用工具",
      "description": "实用工具类插件",
      "icon": "https://cdn.example.com/category-icon.png",
      "sort_order": 1,
      "is_active": true,
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-01T00:00:00Z"
    }
  ]
}
```

### 获取分类详情

```http
GET /api/v1/categories/{id}
```

响应示例：
```json
{
  "success": true,
  "data": {
    "id": "category-id",
    "name": "utility",
    "display_name": "实用工具",
    "description": "实用工具类插件",
    "icon": "https://cdn.example.com/category-icon.png",
    "sort_order": 1,
    "is_active": true,
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z"
  }
}
```

### 创建分类

```http
POST /api/v1/categories
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "name": "new-category",
  "display_name": "新分类",
  "description": "新分类描述",
  "icon": "https://cdn.example.com/category-icon.png",
  "sort_order": 10
}
```

响应示例：
```json
{
  "success": true,
  "data": {
    "id": "new-category-id"
  },
  "message": "分类创建成功"
}
```

### 更新分类

```http
PUT /api/v1/categories/{id}
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "display_name": "更新后的分类名",
  "description": "更新后的分类描述"
}
```

响应示例：
```json
{
  "success": true,
  "data": {
    "id": "category-id"
  },
  "message": "分类更新成功"
}
```

### 删除分类

```http
DELETE /api/v1/categories/{id}
Authorization: Bearer <your-jwt-token>
```

响应示例：
```json
{
  "success": true,
  "data": {
    "id": "category-id"
  },
  "message": "分类删除成功"
}
```

## 用户 API

### 用户注册

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password",
  "name": "User Name"
}
```

响应示例：
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "name": "User Name",
      "created_at": "2023-01-01T00:00:00Z"
    }
  },
  "message": "用户注册成功"
}
```

### 用户登录

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

响应示例：
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_at": "2023-01-01T00:00:00Z",
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "name": "User Name"
    }
  },
  "message": "登录成功"
}
```

### 获取用户信息

```http
GET /api/v1/users/me
Authorization: Bearer <your-jwt-token>
```

响应示例：
```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "User Name",
    "avatar": "https://cdn.example.com/avatar.png",
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z"
  }
}
```

### 更新用户信息

```http
PUT /api/v1/users/me
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "name": "Updated Name",
  "avatar": "https://cdn.example.com/new-avatar.png"
}
```

响应示例：
```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "Updated Name",
    "avatar": "https://cdn.example.com/new-avatar.png",
    "updated_at": "2023-01-01T00:00:00Z"
  },
  "message": "用户信息更新成功"
}
```

### 修改密码

```http
PUT /api/v1/users/me/password
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "current_password": "current-password",
  "new_password": "new-password"
}
```

响应示例：
```json
{
  "success": true,
  "message": "密码修改成功"
}
```

## 系统 API

### 健康检查

```http
GET /api/v1/health
```

响应示例：
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "timestamp": "2023-01-01T00:00:00Z",
    "services": {
      "database": "healthy",
      "redis": "healthy",
      "elasticsearch": "healthy"
    }
  }
}
```

### 系统信息

```http
GET /api/v1/info
```

响应示例：
```json
{
  "success": true,
  "data": {
    "version": "1.0.0",
    "build_time": "2023-01-01T00:00:00Z",
    "git_commit": "abc123",
    "go_version": "1.19",
    "environment": "production"
  }
}
```

### 统计信息

```http
GET /api/v1/stats
```

响应示例：
```json
{
  "success": true,
  "data": {
    "plugins": {
      "total": 1000,
      "active": 800,
      "featured": 50
    },
    "users": {
      "total": 10000,
      "active": 5000,
      "new_today": 100
    },
    "downloads": {
      "total": 100000,
      "today": 1000,
      "this_week": 5000,
      "this_month": 20000
    }
  }
}
```

## 错误代码

| 错误代码 | HTTP 状态码 | 描述 |
|----------|------------|------|
| INVALID_REQUEST | 400 | 请求参数无效 |
| UNAUTHORIZED | 401 | 未授权访问 |
| FORBIDDEN | 403 | 禁止访问 |
| NOT_FOUND | 404 | 资源不存在 |
| CONFLICT | 409 | 资源冲突 |
| VALIDATION_ERROR | 422 | 数据验证失败 |
| RATE_LIMIT_EXCEEDED | 429 | 请求频率超限 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |
| SERVICE_UNAVAILABLE | 503 | 服务不可用 |

## 限流规则

- **未认证用户**：每分钟 100 次请求
- **已认证用户**：每分钟 1000 次请求
- **搜索接口**：每分钟 50 次请求
- **上传接口**：每分钟 10 次请求

## SDK 和工具

### Go SDK

```go
import "github.com/rubickCenter/rubick-backend-go-sdk"

client := rubick.NewClient("https://api.rubick.com", "your-api-key")

// 获取插件列表
plugins, err := client.Plugins.List(&rubick.PluginListOptions{
    Category: "utility",
    Page:     1,
    PageSize: 20,
})

// 创建插件
plugin, err := client.Plugins.Create(&rubick.Plugin{
    Name:        "example-plugin",
    Description: "示例插件",
    Version:     "1.0.0",
    Author:      "Example Author",
    Category:    "utility",
})
```

### JavaScript SDK

```javascript
import { RubickAPI } from '@rubick/backend-js-sdk';

const client = new RubickAPI({
    baseURL: 'https://api.rubick.com',
    apiKey: 'your-api-key'
});

// 获取插件列表
const plugins = await client.plugins.list({
    category: 'utility',
    page: 1,
    pageSize: 20
});

// 创建插件
const plugin = await client.plugins.create({
    name: 'example-plugin',
    description: '示例插件',
    version: '1.0.0',
    author: 'Example Author',
    category: 'utility'
});
```

### Postman 集合

提供完整的 Postman 集合，包含所有 API 接口的示例请求：

1. 下载 [Rubick API Postman Collection](https://api.rubick.com/postman-collection.json)
2. 导入到 Postman
3. 设置环境变量：
   - `base_url`: `https://api.rubick.com`
   - `api_key`: 您的 API 密钥
   - `jwt_token`: 您的 JWT Token

## 更多资源

- [API 参考实现](https://github.com/rubickCenter/rubick-backend)
- [OpenAPI 规范](https://api.rubick.com/openapi.json)
- [SDK 文档](https://docs.rubick.com/sdk)
- [示例代码](https://github.com/rubickCenter/api-examples)