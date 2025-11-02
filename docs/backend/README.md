# Rubick 后端开发文档

## 概述

本文档介绍如何使用 Golang 为 Rubick 开发后端服务，包括插件市场服务、用户认证服务、数据同步服务等。

## 文档目录

### 快速开始
- [环境搭建](./getting-started/environment-setup.md) - 开发环境搭建指南
- [项目结构](./getting-started/project-structure.md) - 后端项目结构说明
- [快速启动](./getting-started/quick-start.md) - 快速启动后端服务

### 核心服务
- [插件市场服务](./services/plugin-market.md) - 插件市场后端服务
- [用户认证服务](./services/auth-service.md) - 用户认证和授权
- [数据同步服务](./services/sync-service.md) - 多端数据同步服务
- [通知服务](./services/notification-service.md) - 系统通知服务

### API 文档
- [RESTful API](./api/rest-api.md) - RESTful API 接口文档
- [GraphQL API](./api/graphql-api.md) - GraphQL API 接口文档
- [WebSocket API](./api/websocket-api.md) - WebSocket 实时通信

### 数据库设计
- [数据库架构](./database/schema.md) - 数据库表结构设计
- [数据迁移](./database/migrations.md) - 数据库迁移指南
- [性能优化](./database/performance.md) - 数据库性能优化

### 开发指南
- [代码规范](./development/coding-standards.md) - Golang 代码规范
- [测试指南](./development/testing.md) - 单元测试和集成测试
- [错误处理](./development/error-handling.md) - 错误处理和日志记录
- [安全指南](./development/security.md) - 安全最佳实践

### 部署运维
- [Docker 部署](./deployment/docker.md) - 使用 Docker 部署
- [Kubernetes 部署](./deployment/kubernetes.md) - 使用 Kubernetes 部署
- [监控告警](./deployment/monitoring.md) - 系统监控和告警
- [CI/CD 流程](./deployment/cicd.md) - 持续集成和部署

## 技术栈

- **语言**: Go 1.19+
- **Web框架**: Gin
- **ORM**: GORM
- **数据库**: PostgreSQL / MySQL
- **缓存**: Redis
- **消息队列**: RabbitMQ / NATS
- **容器化**: Docker
- **编排**: Kubernetes
- **监控**: Prometheus + Grafana
- **日志**: ELK Stack

## 快速导航

### 新手入门

1. 阅读[环境搭建](./getting-started/environment-setup.md)搭建开发环境
2. 了解[项目结构](./getting-started/project-structure.md)
3. 按照[快速启动](./getting-started/quick-start.md)启动服务

### 功能开发

1. 查看[插件市场服务](./services/plugin-market.md)了解插件市场实现
2. 参考[API 文档](./api/rest-api.md)开发接口
3. 遵循[代码规范](./development/coding-standards.md)编写代码

### 部署运维

1. 学习[Docker 部署](./deployment/docker.md)进行容器化部署
2. 配置[监控告警](./deployment/monitoring.md)保障系统稳定
3. 设置[CI/CD 流程](./deployment/cicd.md)实现自动化部署

## 贡献指南

如果您想为后端项目做贡献，请参考：

1. [代码规范](./development/coding-standards.md)
2. [测试指南](./development/testing.md)
3. [提交规范](./development/commit-guidelines.md)

## 获取帮助

- 查看[常见问题](./faq.md)
- 提交 [Issue](https://github.com/rubickCenter/rubick-backend/issues)
- 参与 [讨论](https://github.com/rubickCenter/rubick-backend/discussions)