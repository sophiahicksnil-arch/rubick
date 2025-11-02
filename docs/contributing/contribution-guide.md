# Rubick 贡献指南

## 概述

感谢您对 Rubick 项目的关注！我们欢迎各种形式的贡献，包括但不限于代码贡献、文档改进、问题报告和功能建议。

本指南将帮助您了解如何为 Rubick 项目做出贡献。

## 贡献方式

### 报告问题

如果您发现了 Bug 或有功能建议，请通过以下方式报告：

1. **GitHub Issues**：
   - 访问 [Rubick Issues](https://github.com/rubickCenter/rubick/issues)
   - 点击 "New issue" 创建新问题
   - 选择合适的问题模板

2. **问题报告内容**：
   - 问题描述：清晰描述遇到的问题
   - 复现步骤：详细的问题复现步骤
   - 期望行为：描述您期望的正确行为
   - 环境信息：操作系统、Rubick 版本等
   - 相关截图：如有必要，提供相关截图

### 提交代码

如果您想直接贡献代码，请按照以下步骤进行：

1. **Fork 仓库**：
   - 在 GitHub 上 Fork Rubick 仓库
   - 克隆您的 Fork 到本地

2. **创建分支**：
   ```bash
   git clone https://github.com/your-username/rubick.git
   cd rubick
   git checkout -b feature/your-feature-name
   ```

3. **开发和测试**：
   - 进行代码修改
   - 确保所有测试通过
   - 添加必要的测试用例

4. **提交代码**：
   ```bash
   git add .
   git commit -m "feat: add new feature"
   git push origin feature/your-feature-name
   ```

5. **创建 Pull Request**：
   - 在 GitHub 上创建 Pull Request
   - 填写详细的 PR 描述
   - 等待代码审查

### 改进文档

文档是项目的重要组成部分，您可以通过以下方式改进文档：

1. **修复错误**：
   - 修正文档中的错误信息
   - 更新过时的内容

2. **补充内容**：
   - 添加缺失的文档
   - 完善现有文档

3. **翻译文档**：
   - 将文档翻译为其他语言
   - 改进现有翻译

### 开发插件

插件是 Rubick 生态系统的重要组成部分，您可以通过开发插件为项目做贡献：

1. **开发新插件**：
   - 参考[插件开发指南](../development/plugin-development.md)
   - 发布到 npm 和插件仓库

2. **改进现有插件**：
   - 修复插件 Bug
   - 添加新功能
   - 优化性能

## 开发环境设置

### 环境要求

- Node.js 14.0+
- npm 6.0+
- Git
- 推荐使用 VS Code 作为开发工具

### 本地开发设置

1. **克隆仓库**：
   ```bash
   git clone https://github.com/rubickCenter/rubick.git
   cd rubick
   ```

2. **安装依赖**：
   ```bash
   npm install
   ```

3. **启动开发服务器**：
   ```bash
   npm run electron:serve
   ```

### 开发工具配置

#### VS Code 配置

推荐安装以下 VS Code 扩展：

- ESLint
- Prettier
- Vue Language Features (Volar)
- TypeScript Vue Plugin (Volar)
- Auto Rename Tag
- Bracket Pair Colorizer
- GitLens

#### 调试配置

在 `.vscode/launch.json` 中添加调试配置：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Main Process",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}",
      "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron",
      "windows": {
        "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron.cmd"
      },
      "args": ["."],
      "outputCapture": "std"
    }
  ]
}
```

## 代码规范

### 代码风格

我们使用 ESLint 和 Prettier 来保持代码风格的一致性。

#### ESLint 配置

项目根目录的 `.eslintrc.js` 文件定义了代码规范：

```javascript
module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es6: true
  },
  extends: [
    'plugin:vue/vue3-essential',
    '@vue/standard',
    '@vue/typescript/recommended'
  ],
  parserOptions: {
    ecmaVersion: 2020
  },
  rules: {
    // 自定义规则
  }
};
```

#### Prettier 配置

项目根目录的 `.prettierrc` 文件定义了代码格式化规则：

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "none",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
```

### 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范来格式化提交信息。

#### 提交类型

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式化（不影响功能）
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

#### 提交格式

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

#### 示例

```bash
feat(plugin): add new plugin manager

- Add plugin installation feature
- Add plugin uninstallation feature
- Improve plugin search functionality

Closes #123
```

### 代码审查

所有代码贡献都需要经过代码审查。审查重点包括：

1. **功能正确性**：
   - 代码是否实现了预期功能
   - 是否有潜在的 Bug

2. **代码质量**：
   - 代码是否遵循项目规范
   - 是否有重复代码
   - 是否有性能问题

3. **测试覆盖**：
   - 是否有足够的测试用例
   - 测试是否覆盖边界情况

4. **文档更新**：
   - 是否更新了相关文档
   - 文档是否准确完整

## 测试指南

### 测试类型

Rubick 项目包含以下类型的测试：

1. **单元测试**：
   - 测试单个函数或组件
   - 使用 Jest 框架

2. **集成测试**：
   - 测试多个组件的交互
   - 测试完整的用户流程

3. **端到端测试**：
   - 测试完整的应用场景
   - 使用 Spectron 或 Playwright

### 运行测试

```bash
# 运行所有测试
npm test

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 运行端到端测试
npm run test:e2e

# 生成测试覆盖率报告
npm run test:coverage
```

### 编写测试

#### 单元测试示例

```javascript
// tests/unit/utils.test.js
import { formatDate } from '@/utils/date';

describe('formatDate', () => {
  test('should format date correctly', () => {
    const date = new Date('2023-01-01');
    expect(formatDate(date)).toBe('2023-01-01');
  });

  test('should handle invalid date', () => {
    expect(formatDate(null)).toBe('');
  });
});
```

#### 组件测试示例

```javascript
// tests/unit/components/HelloWorld.test.js
import { mount } from '@vue/test-utils';
import HelloWorld from '@/components/HelloWorld.vue';

describe('HelloWorld', () => {
  test('renders props.msg when passed', () => {
    const msg = 'new message';
    const wrapper = mount(HelloWorld, {
      props: { msg }
    });
    expect(wrapper.text()).toMatch(msg);
  });
});
```

## 发布流程

### 版本管理

我们使用语义化版本控制 (SemVer)：

- `MAJOR.MINOR.PATCH`
- `MAJOR`: 不兼容的 API 修改
- `MINOR`: 向下兼容的功能性新增
- `PATCH`: 向下兼容的问题修正

### 发布步骤

1. **更新版本号**：
   ```bash
   npm version patch  # 或 minor, major
   ```

2. **更新 CHANGELOG**：
   - 更新 CHANGELOG.md
   - 记录本次变更

3. **创建发布标签**：
   ```bash
   git tag -a v1.0.0 -m "Release version 1.0.0"
   git push origin v1.0.0
   ```

4. **触发自动构建**：
   - GitHub Actions 会自动构建和发布
   - 构建产物会自动上传到 GitHub Releases

### 发布检查清单

发布前请确认：

- [ ] 所有测试通过
- [ ] 代码已通过审查
- [ ] 文档已更新
- [ ] CHANGELOG 已更新
- [ ] 版本号已更新
- [ ] 构建成功

## 社区准则

### 行为准则

我们致力于为每个人提供友好、安全和欢迎的环境，无论：

- 性别、性别认同和表达
- 性取向
- 残疾
- 外貌
- 身体大小
- 种族
- 年龄
- 宗教

#### 预期行为

- 使用友好和包容的语言
- 尊重不同的观点和经验
- 优雅地接受建设性批评
- 关注对社区最有利的事情
- 对其他社区成员表示同理心

#### 不当行为

- 使用性化的语言或图像
- 人身攻击或政治攻击
- 公开或私下骚扰
- 未经明确许可发布他人的私人信息
- 其他在专业环境中可能被认为不当的行为

### 沟通渠道

1. **GitHub Issues**：
   - 问题报告和功能请求
   - 技术讨论

2. **GitHub Discussions**：
   - 一般讨论
   - 问答

3. **知识星球**：
   - 更深入的讨论
   - 与开发团队直接交流

## 获得帮助

如果您在贡献过程中遇到问题，可以通过以下方式获得帮助：

1. **查看文档**：
   - [项目概述](../development/overview.md)
   - [架构设计](../development/architecture.md)
   - [API 文档](../development/api.md)

2. **搜索现有问题**：
   - 在 GitHub Issues 中搜索类似问题
   - 查看是否有已解决的方案

3. **提问**：
   - 在 GitHub Issues 中提问
   - 在 GitHub Discussions 中讨论
   - 加入知识星球获取更多支持

## 认可贡献者

我们感谢所有为 Rubick 项目做出贡献的人。贡献者会在以下地方被认可：

1. **贡献者列表**：
   - GitHub 仓库的贡献者列表
   - README 中的贡献者部分

2. **发布说明**：
   - 每个版本的发布说明中会提到主要贡献者

3. **年度总结**：
   - 年度项目总结中会感谢所有贡献者

## 资源链接

### 项目资源

- [GitHub 仓库](https://github.com/rubickCenter/rubick)
- [Rubick 官网](https://rubick.vip)
- [插件仓库](https://gitee.com/rubick-center)
- [插件数据库](https://gitcode.net/rubickcenter/rubick-database)

### 开发资源

- [Electron 官方文档](https://electronjs.org/docs)
- [Vue 3 文档](https://v3.vuejs.org/)
- [TypeScript 文档](https://www.typescriptlang.org/docs/)

### 社区资源

- [知识星球](https://rubick.vip)
- [GitHub Discussions](https://github.com/rubickCenter/rubick/discussions)
- [GitHub Issues](https://github.com/rubickCenter/rubick/issues)

## 许可证

通过贡献代码，您同意您的贡献将在与项目相同的 [MIT 许可证](https://github.com/rubickCenter/rubick/blob/master/LICENSE) 下授权。

---

再次感谢您对 Rubick 项目的关注和贡献！您的参与让 Rubick 变得更好。