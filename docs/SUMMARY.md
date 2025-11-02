# Rubick 技术文档索引

## 文档概述

本文档索引提供了 Rubick 技术文档的完整导航，帮助用户快速找到所需信息。

## 用户文档

### 快速开始

- [安装指南](./guide/installation.md) - 如何安装和配置 Rubick
- [使用指南](./guide/usage.md) - Rubick 的基本使用方法
- [常见问题](./guide/faq.md) - 常见问题解答

### 高级使用

- [插件市场](./guide/plugin-market.md) - 如何使用插件市场
- [AI 接入管理（设置）](./guide/ai-settings.md) - 在设置页新增并管理 AI Provider

## 开发者文档

### 项目介绍

- [项目概述](./development/overview.md) - 项目概述和核心功能
- [架构设计](./development/architecture.md) - 系统架构设计

### 开发指南

- [API 文档](./development/api.md) - 核心 API 参考
- [插件开发指南](./development/plugin-development.md) - 如何开发 Rubick 插件
- [构建和部署](./development/deployment.md) - 如何构建和部署 Rubick
- [AI 能力集成（基座架构）](./development/ai-integration.md) - 基座集成主流大模型与 Provider 适配
- [插件 AI API 参考](./development/ai-plugin-api.md) - 插件侧统一 AI 调用接口
- [AI 快速开始](./development/ai-quickstart.md) - 快速配置与调用示例、常见问题

## 后端开发文档

### 快速开始

- [后端开发概述](./backend/README.md) - 后端项目概述
- [环境搭建](./backend/getting-started/environment-setup.md) - 开发环境配置
- [项目结构](./backend/getting-started/project-structure.md) - 项目目录结构

### 核心服务

- [用户管理服务](./backend/services/user-management.md) - 用户认证和授权
- [插件市场服务](./backend/services/plugin-market.md) - 插件市场管理
- [通知服务](./backend/services/notification.md) - 通知和消息系统

### API 文档

- [RESTful API](./backend/api/rest-api.md) - REST API 接口文档

### 部署指南

- [Docker 部署](./backend/deployment/docker.md) - Docker 容器化部署
- [Kubernetes 部署](./backend/deployment/kubernetes.md) - K8s 集群部署

## 贡献指南

### 参与贡献

- [贡献指南](./contributing/contribution-guide.md) - 如何为项目做贡献
- [代码规范](./contributing/coding-standards.md) - 代码规范和最佳实践
- [发布流程](./contributing/release-process.md) - 版本发布流程

## 参考资源

### 官方资源

- [Rubick 官网](https://rubick.vip) - 官方网站
- [GitHub 仓库](https://github.com/rubickCenter/rubick) - 源代码仓库
- [插件仓库](https://gitee.com/rubick-center) - 插件仓库

### 开发资源

- [Electron 文档](https://electronjs.org/docs) - Electron 官方文档
- [Vue 3 文档](https://v3.vuejs.org/) - Vue 3 官方文档
- [TypeScript 文档](https://www.typescriptlang.org/docs/) - TypeScript 官方文档

### 社区资源

- [知识星球](https://rubick.vip) - 知识星球社区
- [GitHub Discussions](https://github.com/rubickCenter/rubick/discussions) - GitHub 讨论
- [GitHub Issues](https://github.com/rubickCenter/rubick/issues) - 问题报告

## 文档结构

```
docs/
├── README.md                       # 文档首页
├── SUMMARY.md                      # 文档索引（本文件）
├── guide/                          # 用户指南
│   ├── installation.md             # 安装指南
│   ├── usage.md                    # 使用指南
│   ├── plugin-market.md            # 插件市场
│   ├── faq.md                      # 常见问题
│   └── ai-settings.md              # AI 接入管理（设置）
├── development/                    # 开发者文档
│   ├── overview.md                 # 项目概述
│   ├── architecture.md             # 架构设计
│   ├── api.md                      # API 文档
│   ├── plugin-development.md       # 插件开发指南
│   ├── deployment.md               # 构建和部署
│   ├── ai-integration.md           # AI 能力集成（基座架构）
│   ├── ai-plugin-api.md            # 插件 AI API 参考
│   └── ai-quickstart.md            # AI 快速开始
├── backend/                        # 后端开发文档
│   ├── README.md                   # 后端开发概述
│   ├── getting-started/            # 快速开始
│   │   ├── environment-setup.md    # 环境搭建
│   │   └── project-structure.md    # 项目结构
│   ├── services/                   # 核心服务
│   │   ├── user-management.md      # 用户管理服务
│   │   ├── plugin-market.md        # 插件市场服务
│   │   └── notification.md         # 通知服务
│   ├── api/                        # API 文档
│   │   └── rest-api.md             # RESTful API
│   └── deployment/                 # 部署指南
│       ├── docker.md               # Docker 部署
│       └── kubernetes.md           # Kubernetes 部署
└── contributing/                   # 贡献指南
    ├── contribution-guide.md       # 贡献指南
    ├── coding-standards.md         # 代码规范
    └── release-process.md          # 发布流程
```

## 文档维护

### 更新频率

- **用户文档**：每次版本发布时更新
- **开发者文档**：API 与架构变更时更新
- **贡献指南**：流程变更时更新

### 贡献方式

如果您想改进文档，可以通过以下方式：

1. **报告问题**：在 GitHub Issues 中报告文档问题
2. **提交 PR**：直接提交文档改进
3. **参与讨论**：在 GitHub Discussions 中讨论文档改进

### 文档规范

- 使用 Markdown 格式
- 遵循项目代码规范
- 提供清晰的示例
- 保持内容准确和最新

## 快速导航

### 新用户

1. 阅读[安装指南](./guide/installation.md)安装 Rubick
2. 查看[使用指南](./guide/usage.md)了解基本功能
3. 浏览[插件市场](./guide/plugin-market.md)安装有用插件
4. 遇到问题时查看[常见问题](./guide/faq.md)
5. 使用[AI 接入管理（设置）](./guide/ai-settings.md)配置大模型 Provider

### 插件开发者

1. 阅读[项目概述](./development/overview.md)了解项目架构
2. 查看[插件开发指南](./development/plugin-development.md)学习插件开发
3. 参考[API 文档](./development/api.md)了解可用 API
4. 阅读[AI 能力集成（基座架构）](./development/ai-integration.md)
5. 阅读[插件 AI API 参考](./development/ai-plugin-api.md)
6. 阅读并实践[AI 快速开始](./development/ai-quickstart.md)

### 后端开发者

1. 阅读[后端开发概述](./backend/README.md)了解后端架构
2. 查看[环境搭建](./backend/getting-started/environment-setup.md)配置环境
3. 了解[核心服务](./backend/services/)学习后端服务设计
4. 参考[RESTful API](./backend/api/rest-api.md)了解后端接口
5. 查看[部署指南](./backend/deployment/)了解部署方案

## 反馈和建议

如果您对文档有任何建议或发现问题，欢迎：

1. 在 [GitHub Issues](https://github.com/rubickCenter/rubick/issues) 提交问题
2. 在 [GitHub Discussions](https://github.com/rubickCenter/rubick/discussions) 参与讨论
3. 加入我们的[知识星球](https://rubick.vip)获取更多支持

---

感谢您对 Rubick 项目的关注和支持！