# Rubick 发布流程

## 概述

本文档描述了 Rubick 项目的版本发布流程，包括版本管理、构建、测试和发布等步骤。

## 版本管理

### 语义化版本控制

Rubick 使用 [语义化版本控制](https://semver.org/) (SemVer) 规范：

- **主版本号 (MAJOR)**：不兼容的 API 修改
- **次版本号 (MINOR)**：向下兼容的功能性新增
- **修订号 (PATCH)**：向下兼容的问题修正

版本格式：`MAJOR.MINOR.PATCH`

例如：`1.0.0`、`1.1.0`、`1.1.1`

### 版本类型

#### 主版本 (Major)

当进行以下更改时，需要发布主版本：

- 不兼容的 API 更改
- 删除重要功能
- 重大架构变更

示例：`1.0.0` → `2.0.0`

#### 次版本 (Minor)

当进行以下更改时，需要发布次版本：

- 新增功能
- 向后兼容的 API 更改
- 新增插件接口

示例：`1.0.0` → `1.1.0`

#### 修订版本 (Patch)

当进行以下更改时，需要发布修订版本：

- Bug 修复
- 性能优化
- 文档更新

示例：`1.0.0` → `1.0.1`

### 预发布版本

在正式版本发布前，可以发布预发布版本：

- **Alpha (α)**：内部测试版本
- **Beta (β)**：公开测试版本
- **RC (Release Candidate)**：发布候选版本

格式：`MAJOR.MINOR.PATCH-PRERELEASE`

例如：`1.1.0-alpha.1`、`1.1.0-beta.1`、`1.1.0-rc.1`

## 发布周期

### 发布计划

Rubick 采用定期发布和紧急发布相结合的策略：

1. **定期发布**：每月发布一个次版本
2. **紧急发布**：必要时随时发布修订版本
3. **主版本**：根据开发进度发布

### 发布时间表

- **Alpha 版本**：每月第一周
- **Beta 版本**：每月第二周
- **RC 版本**：每月第三周
- **正式版本**：每月第四周

## 发布流程

### 准备阶段

#### 1. 功能冻结

在计划发布前一周，进入功能冻结期：

- 停止合并新功能
- 只接受 Bug 修复和文档更新
- 完成正在开发的功能

#### 2. 代码审查

确保所有待合并的代码都经过审查：

- 代码质量检查
- 测试覆盖率检查
- 性能影响评估
- 安全性审查

#### 3. 测试验证

进行全面的测试验证：

- 单元测试
- 集成测试
- 端到端测试
- 手动测试
- 兼容性测试

### 发布阶段

#### 1. 更新版本号

```bash
# 更新主版本
npm version major

# 更新次版本
npm version minor

# 更新修订版本
npm version patch

# 更新预发布版本
npm version prerelease --preid=beta
```

#### 2. 更新 CHANGELOG

更新 `CHANGELOG.md` 文件：

```markdown
## [1.1.0] - 2023-01-01

### 新增
- 添加插件市场功能
- 支持自定义主题
- 新增快捷键配置

### 修复
- 修复启动缓慢问题
- 解决内存泄漏问题
- 修复插件加载失败问题

### 改进
- 优化搜索性能
- 改进用户界面
- 提升应用稳定性

### 安全
- 修复 XSS 漏洞
- 加强输入验证

### 文档
- 更新 API 文档
- 添加插件开发指南
- 完善用户手册
```

#### 3. 创建发布标签

```bash
# 创建带注释的标签
git tag -a v1.1.0 -m "Release version 1.1.0"

# 推送标签到远程仓库
git push origin v1.1.0
```

#### 4. 触发自动构建

推送标签后会自动触发 GitHub Actions 进行构建：

- 构建多平台安装包
- 运行自动化测试
- 生成构建产物
- 创建 GitHub Release

### 发布后阶段

#### 1. 验证发布

验证发布是否成功：

- 检查 GitHub Release 是否创建
- 下载并测试安装包
- 验证自动更新功能
- 检查文档更新

#### 2. 通知发布

通过以下渠道通知发布：

- GitHub Release
- 官方网站
- 社交媒体
- 知识星球
- 开发者邮件列表

#### 3. 监控反馈

发布后密切监控用户反馈：

- GitHub Issues
- 用户评论
- 错误报告
- 性能指标

## 自动化发布

### GitHub Actions 工作流

项目使用 GitHub Actions 实现自动化发布：

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test

  build:
    needs: test
    strategy:
      matrix:
        os: [macos-latest, ubuntu-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
      - name: Install dependencies
        run: npm ci
      - name: Build application
        run: npm run electron:build
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - name: Upload artifacts
        uses: actions/upload-artifact@v2
        with:
          name: ${{ matrix.os }}-build
          path: dist_electron/

  release:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Create Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          body: |
            ## 更新内容
            请查看 CHANGELOG.md 获取详细信息。
          draft: false
          prerelease: ${{ contains(github.ref, 'alpha') || contains(github.ref, 'beta') || contains(github.ref, 'rc') }}
      - name: Download artifacts
        uses: actions/download-artifact@v2
        with:
          path: artifacts/
      - name: Upload Release Assets
        uses: actions/upload-release-asset@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          upload_url: ${{ steps.create_release.outputs.upload_url }}
          asset_path: artifacts/macOS-build/Rubick-1.1.0.dmg
          asset_name: Rubick-1.1.0.dmg
          asset_content_type: application/octet-stream
```

### 发布脚本

项目提供发布脚本 `release.js` 来简化发布流程：

```javascript
// release.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const version = process.argv[2];
const type = process.argv[3] || 'patch';

if (!version) {
  console.error('Please provide a version number');
  process.exit(1);
}

// 更新版本号
console.log(`Updating version to ${version}...`);
execSync(`npm version ${type}`, { stdio: 'inherit' });

// 更新 CHANGELOG
console.log('Updating CHANGELOG...');
// 这里可以添加自动更新 CHANGELOG 的逻辑

// 提交更改
console.log('Committing changes...');
execSync('git add .', { stdio: 'inherit' });
execSync(`git commit -m "chore: release v${version}"`, { stdio: 'inherit' });

// 创建标签
console.log(`Creating tag v${version}...`);
execSync(`git tag -a v${version} -m "Release version ${version}"`, { stdio: 'inherit' });

// 推送更改
console.log('Pushing changes...');
execSync('git push origin main', { stdio: 'inherit' });
execSync(`git push origin v${version}`, { stdio: 'inherit' });

console.log(`Release v${version} completed successfully!`);
```

使用方法：

```bash
# 发布修订版本
node release.js 1.1.1 patch

# 发布次版本
node release.js 1.2.0 minor

# 发布主版本
node release.js 2.0.0 major
```

## 回滚流程

### 回滚条件

在以下情况下需要回滚：

- 严重 Bug 影响大量用户
- 安全漏洞需要立即修复
- 性能问题导致应用不可用
- 兼容性问题影响核心功能

### 回滚步骤

#### 1. 紧急修复

```bash
# 创建修复分支
git checkout -b hotfix/fix-critical-bug

# 修复问题
# ... 修复代码 ...

# 测试修复
npm test

# 提交修复
git add .
git commit -m "fix: critical bug fix"

# 推送修复分支
git push origin hotfix/fix-critical-bug
```

#### 2. 发布修复版本

```bash
# 更新版本号
npm version patch

# 创建修复标签
git tag -a v1.1.1 -m "Hotfix release v1.1.1"

# 推送标签
git push origin v1.1.1
```

#### 3. 通知用户

通过以下渠道通知用户：

- GitHub Release
- 官方网站
- 社交媒体
- 应用内通知

## 发布检查清单

### 发布前检查

- [ ] 所有测试通过
- [ ] 代码已通过审查
- [ ] 文档已更新
- [ ] CHANGELOG 已更新
- [ ] 版本号已更新
- [ ] 构建成功
- [ ] 安装包测试通过
- [ ] 自动更新功能正常

### 发布后检查

- [ ] GitHub Release 已创建
- [ ] 安装包可正常下载
- [ ] 官网下载链接已更新
- [ ] 用户通知已发送
- [ ] 错误监控正常
- [ ] 用户反馈渠道畅通

## 版本支持策略

### 支持周期

- **主版本**：支持 12 个月
- **次版本**：支持 6 个月
- **修订版本**：支持 3 个月

### 更新策略

- **安全更新**：所有支持版本都会提供
- **Bug 修复**：仅最新主版本和次版本提供
- **新功能**：仅最新主版本提供

### 通知策略

- **停止支持前 3 个月**：发出通知
- **停止支持前 1 个月**：再次通知
- **停止支持时**：最后通知

## 发布工具和资源

### 必需工具

- **Node.js**：16.0+
- **npm**：8.0+
- **Git**：2.0+
- **GitHub CLI**：用于自动化操作

### 推荐工具

- **GitHub Desktop**：图形化 Git 操作
- **Release It**：自动化发布工具
- **Semantic Release**：语义化发布工具
- **Changelog Generator**：自动生成 CHANGELOG

### 有用链接

- [GitHub Releases](https://github.com/rubickCenter/rubick/releases)
- [语义化版本控制](https://semver.org/)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Electron Builder 文档](https://electron.build/)

## 常见问题

### Q: 如何决定版本类型？

A: 根据更改的性质决定：
- 不兼容的 API 更改 → 主版本
- 新增功能 → 次版本
- Bug 修复 → 修订版本

### Q: 什么时候发布预发布版本？

A: 在以下情况下发布预发布版本：
- 需要社区测试新功能
- 不确定更改的影响
- 准备发布重大更新

### Q: 如何处理发布失败？

A: 按以下步骤处理：
1. 分析失败原因
2. 修复问题
3. 删除失败的 Release
4. 重新发布

### Q: 如何确保发布质量？

A: 通过以下方式确保质量：
- 全面的测试
- 代码审查
- 自动化检查
- 用户反馈

---

通过遵循本发布流程，我们可以确保 Rubick 的发布过程高效、可靠，并为用户提供高质量的软件。