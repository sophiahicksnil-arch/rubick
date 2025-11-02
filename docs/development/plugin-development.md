# Rubick 插件开发指南

## 插件概述

Rubick 插件是基于 npm 包模式的功能扩展，可以增强 Rubick 的功能。插件分为两种类型：UI 插件和系统插件，每种类型有不同的特点和适用场景。

### 插件类型

#### UI 插件

UI 插件运行在独立的 BrowserView 中，提供特定的用户界面和功能。

**特点**：
- 安装后立即可用
- 运行在沙箱环境中
- 通过 IPC 与主进程通信
- 可以有自己的界面和交互

**适用场景**：
- 特定功能的用户界面
- 需要用户交互的工具
- 独立的功能模块

#### 系统插件

系统插件集成到 Rubick 核心系统中，可以修改和扩展系统行为。

**特点**：
- 需要重启 Rubick 后生效
- 可以访问更多系统 API
- 可以修改 Rubick 核心行为
- 通常用于系统级功能增强

**适用场景**：
- 系统级功能增强
- 核心行为修改
- 底层功能扩展

## 开发环境准备

### 环境要求

- Node.js 14.0+
- npm 6.0+
- Git
- 文本编辑器（推荐 VS Code）

### 开发工具

1. **Rubick Plugin CLI**：插件开发脚手架工具
2. **Electron DevTools**：调试工具
3. **Vue DevTools**：Vue 调试工具

### 安装 Rubick Plugin CLI

```bash
npm install -g @rubick/plugin-cli
```

## 创建插件项目

### 使用 CLI 创建项目

```bash
# 创建 UI 插件
rubick create my-ui-plugin --type ui

# 创建系统插件
rubick create my-system-plugin --type system
```

### 项目结构

#### UI 插件结构

```
my-ui-plugin/
├── src/
│   ├── index.html         # 插件主页面
│   ├── main.js           # 插件主逻辑
│   └── style.css         # 插件样式
├── plugin.json           # 插件配置文件
├── package.json          # npm 包配置
└── README.md            # 插件说明
```

#### 系统插件结构

```
my-system-plugin/
├── src/
│   ├── index.js          # 插件主逻辑
│   └── hooks/           # 系统钩子
├── plugin.json          # 插件配置文件
├── package.json         # npm 包配置
└── README.md           # 插件说明
```

## 插件配置

### plugin.json 配置

```json
{
  "name": "my-plugin",
  "pluginName": "我的插件",
  "description": "这是一个示例插件",
  "version": "1.0.0",
  "author": "Your Name",
  "logo": "logo.png",
  "main": "src/index.html",
  "features": [
    {
      "code": "example-feature",
      "explain": "示例功能",
      "cmds": ["example", "ex"],
      "icon": "icon.png"
    }
  ],
  "pluginType": "ui",
  "platform": ["win32", "darwin", "linux"],
  "keywords": ["rubick", "plugin", "example"]
}
```

### 配置字段说明

- `name`: 插件唯一标识符（npm 包名）
- `pluginName`: 插件显示名称
- `description`: 插件描述
- `version`: 插件版本
- `author`: 插件作者
- `logo`: 插件图标路径
- `main`: 插件主文件路径（UI 插件）
- `features`: 插件功能列表
- `pluginType`: 插件类型（"ui" 或 "system"）
- `platform`: 支持的平台列表
- `keywords`: 关键词列表

## UI 插件开发

### 基本结构

#### HTML 结构 (index.html)

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>我的插件</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="container">
    <h1>我的插件</h1>
    <div class="content">
      <!-- 插件内容 -->
    </div>
  </div>
  <script src="main.js"></script>
</body>
</html>
```

#### JavaScript 逻辑 (main.js)

```javascript
// 获取 Rubick API
const { api } = window.rubick;

// 插件初始化
document.addEventListener('DOMContentLoaded', () => {
  initPlugin();
});

function initPlugin() {
  // 设置子输入框
  api.setSubInput({
    placeholder: '请输入内容'
  });
  
  // 监听子输入框变化
  api.onSubInputChange((data) => {
    handleInputChange(data.text);
  });
}

function handleInputChange(text) {
  // 处理输入变化
  console.log('Input changed:', text);
}

// 插件功能实现
function executeFeature(featureCode, inputData) {
  switch (featureCode) {
    case 'example-feature':
      handleExampleFeature(inputData);
      break;
    default:
      console.warn('Unknown feature:', featureCode);
  }
}

function handleExampleFeature(inputData) {
  // 实现示例功能
  api.showNotification({
    body: '执行示例功能：' + inputData
  });
}
```

#### CSS 样式 (style.css)

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: #f5f5f5;
  color: #333;
}

.container {
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
}

h1 {
  font-size: 24px;
  margin-bottom: 20px;
  color: #1890ff;
}

.content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
```

### Rubick API 使用

#### 窗口操作

```javascript
// 设置窗口高度
api.setExpendHeight(400);

// 显示通知
api.showNotification({
  body: '操作完成！'
});

// 复制文本
api.copyText({
  text: 'Hello, Rubick!'
});
```

#### 文件操作

```javascript
// 显示文件选择对话框
const files = api.showOpenDialog({
  title: '选择文件',
  filters: [
    { name: 'Text Files', extensions: ['txt'] },
    { name: 'All Files', extensions: ['*'] }
  ]
});

// 显示文件保存对话框
const filePath = api.showSaveDialog({
  title: '保存文件',
  defaultPath: 'output.txt',
  filters: [
    { name: 'Text Files', extensions: ['txt'] }
  ]
});
```

#### 系统操作

```javascript
// 执行截图
api.screenCapture();

// 模拟键盘按键
api.simulateKeyboardTap({
  key: 'a',
  modifier: ['ctrl']
});

// 在文件管理器中显示文件
api.shellShowItemInFolder({
  path: '/path/to/file.txt'
});
```

## 系统插件开发

### 基本结构

#### 主逻辑 (index.js)

```javascript
const { ipcMain, app } = require('electron');
const path = require('path');

class MySystemPlugin {
  constructor() {
    this.init();
  }

  init() {
    // 注册 IPC 处理器
    this.registerIpcHandlers();
    
    // 注册系统钩子
    this.registerHooks();
  }

  registerIpcHandlers() {
    ipcMain.handle('my-plugin:doSomething', async (event, data) => {
      return await this.doSomething(data);
    });
  }

  registerHooks() {
    // 应用启动钩子
    app.on('ready', () => {
      this.onAppReady();
    });
  }

  async doSomething(data) {
    // 实现插件功能
    console.log('Doing something with:', data);
    return { success: true, result: 'Done!' };
  }

  onAppReady() {
    // 应用启动时的处理
    console.log('My system plugin is ready!');
  }
}

module.exports = MySystemPlugin;
```

#### 系统钩子 (hooks/index.js)

```javascript
const fs = require('fs');
const path = require('path');

class SystemHooks {
  constructor() {
    this.hooks = {};
  }

  // 注册钩子
  registerHook(name, handler) {
    if (!this.hooks[name]) {
      this.hooks[name] = [];
    }
    this.hooks[name].push(handler);
  }

  // 触发钩子
  triggerHook(name, data) {
    if (this.hooks[name]) {
      this.hooks[name].forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Hook ${name} error:`, error);
        }
      });
    }
  }

  // 应用启动钩子
  onAppReady() {
    this.registerHook('app:ready', () => {
      console.log('App is ready!');
    });
  }

  // 插件加载钩子
  onPluginLoad() {
    this.registerHook('plugin:load', (plugin) => {
      console.log('Plugin loaded:', plugin.name);
    });
  }
}

module.exports = SystemHooks;
```

### 系统插件 API

#### 访问主进程 API

```javascript
const { BrowserWindow } = require('electron');

// 获取主窗口
const mainWindow = BrowserWindow.getFocusedWindow();

// 发送事件到渲染进程
mainWindow.webContents.send('my-plugin:event', {
  type: 'update',
  data: { status: 'updated' }
});
```

#### 访问文件系统

```javascript
const fs = require('fs');
const path = require('path');

// 读取文件
const filePath = path.join(app.getPath('userData'), 'my-plugin-data.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// 写入文件
fs.writeFileSync(filePath, JSON.stringify(data), 'utf8');
```

#### 访问系统功能

```javascript
const { shell } = require('electron');

// 打开外部链接
shell.openExternal('https://example.com');

// 在文件管理器中显示文件
shell.showItemInFolder('/path/to/file.txt');
```

## 插件测试

### 单元测试

使用 Jest 进行单元测试：

```javascript
// test/plugin.test.js
const MyPlugin = require('../src/main.js');

describe('MyPlugin', () => {
  let plugin;

  beforeEach(() => {
    plugin = new MyPlugin();
  });

  test('should initialize correctly', () => {
    expect(plugin).toBeDefined();
  });

  test('should do something correctly', async () => {
    const result = await plugin.doSomething({ test: 'data' });
    expect(result.success).toBe(true);
  });
});
```

### 集成测试

在 Rubick 环境中测试插件：

```javascript
// test/integration.test.js
const { app, BrowserWindow } = require('electron');

describe('Plugin Integration', () => {
  let mainWindow;

  beforeAll(async () => {
    await app.whenReady();
    mainWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });
  });

  afterAll(async () => {
    if (mainWindow) {
      mainWindow.close();
    }
    await app.quit();
  });

  test('should load plugin correctly', async () => {
    // 加载插件
    await mainWindow.loadFile('src/index.html');
    
    // 测试插件功能
    const result = await mainWindow.webContents.executeJavaScript(`
      window.rubick.api.doSomething({ test: 'data' });
    `);
    
    expect(result.success).toBe(true);
  });
});
```

## 插件发布

### 准备发布

1. **更新版本号**：
   ```json
   {
     "version": "1.0.0"
   }
   ```

2. **更新插件配置**：
   ```json
   {
     "name": "my-plugin",
     "pluginName": "我的插件",
     "description": "这是一个示例插件",
     "version": "1.0.0",
     "author": "Your Name",
     "logo": "logo.png",
     "main": "src/index.html",
     "features": [
       {
         "code": "example-feature",
         "explain": "示例功能",
         "cmds": ["example", "ex"],
         "icon": "icon.png"
       }
     ],
     "pluginType": "ui",
     "platform": ["win32", "darwin", "linux"],
     "keywords": ["rubick", "plugin", "example"]
   }
   ```

3. **编写 README**：
   ```markdown
   # 我的插件
   
   ## 功能描述
   
   这是一个示例插件，展示了如何开发 Rubick 插件。
   
   ## 安装方法
   
   在 Rubick 插件市场中搜索 "my-plugin" 并安装。
   
   ## 使用方法
   
   1. 呼起 Rubick
   2. 输入 "example" 或 "ex"
   3. 选择插件功能并执行
   
   ## 开发说明
   
   ## 许可证
   
   MIT
   ```

### 发布到 npm

```bash
# 登录 npm
npm login

# 发布插件
npm publish
```

### 提交到 Rubick 插件仓库

1. **Fork 插件仓库**：
   ```bash
   git clone https://github.com/rubickCenter/rubick-database.git
   ```

2. **添加插件信息**：
   ```json
   {
     "name": "my-plugin",
     "pluginName": "我的插件",
     "description": "这是一个示例插件",
     "version": "1.0.0",
     "author": "Your Name",
     "logo": "https://cdn.jsdelivr.net/npm/my-plugin/logo.png",
     "main": "src/index.html",
     "features": [
       {
         "code": "example-feature",
         "explain": "示例功能",
         "cmds": ["example", "ex"],
         "icon": "https://cdn.jsdelivr.net/npm/my-plugin/icon.png"
       }
     ],
     "pluginType": "ui",
     "platform": ["win32", "darwin", "linux"],
     "keywords": ["rubick", "plugin", "example"]
   }
   ```

3. **提交 Pull Request**：
   ```bash
   git add .
   git commit -m "Add my-plugin"
   git push origin main
   ```

## 最佳实践

### 代码规范

1. **使用 ESLint**：
   ```json
   {
     "extends": ["eslint:recommended"],
     "env": {
       "browser": true,
       "node": true,
       "es6": true
     }
   }
   ```

2. **使用 Prettier**：
   ```json
   {
     "semi": true,
     "singleQuote": true,
     "tabWidth": 2
   }
   ```

3. **使用 TypeScript**（可选）：
   ```typescript
   interface PluginAPI {
     setSubInput(data: { placeholder: string }): void;
     showNotification(data: { body: string }): void;
     copyText(data: { text: string }): boolean;
   }
   
   declare global {
     interface Window {
       rubick: {
         api: PluginAPI;
       };
     }
   }
   ```

### 性能优化

1. **延迟加载**：
   ```javascript
   // 延迟加载非关键资源
   document.addEventListener('DOMContentLoaded', () => {
     setTimeout(() => {
       loadNonCriticalResources();
     }, 1000);
   });
   ```

2. **事件防抖**：
   ```javascript
   function debounce(func, wait) {
     let timeout;
     return function executedFunction(...args) {
       const later = () => {
         clearTimeout(timeout);
         func(...args);
       };
       clearTimeout(timeout);
       timeout = setTimeout(later, wait);
     };
   }
   
   // 使用防抖处理输入
   const debouncedHandler = debounce(handleInputChange, 300);
   ```

3. **内存管理**：
   ```javascript
   // 及时清理事件监听器
   document.addEventListener('DOMContentLoaded', () => {
     const handler = () => console.log('Clicked');
     button.addEventListener('click', handler);
     
     // 清理函数
     return () => {
       button.removeEventListener('click', handler);
     };
   });
   ```

### 错误处理

1. **全局错误捕获**：
   ```javascript
   window.addEventListener('error', (event) => {
     console.error('Global error:', event.error);
     // 发送错误报告
   });
   
   window.addEventListener('unhandledrejection', (event) => {
     console.error('Unhandled promise rejection:', event.reason);
     // 发送错误报告
   });
   ```

2. **API 错误处理**：
   ```javascript
   async function callAPI(apiFunction, data) {
     try {
       const result = await apiFunction(data);
       return result;
     } catch (error) {
       console.error('API Error:', error);
       // 显示用户友好的错误信息
       api.showNotification({
         body: '操作失败，请稍后重试'
       });
       return null;
     }
   }
   ```

### 安全考虑

1. **输入验证**：
   ```javascript
   function validateInput(input) {
     if (typeof input !== 'string') {
       throw new Error('Input must be a string');
     }
     if (input.length > 1000) {
       throw new Error('Input too long');
     }
     return input.trim();
   }
   ```

2. **XSS 防护**：
   ```javascript
   function escapeHTML(str) {
     return str.replace(/[&<>"']/g, (match) => {
       const escape = {
         '&': '&',
         '<': '<',
         '>': '>',
         '"': '"',
         "'": '''
       };
       return escape[match];
     });
   }
   ```

3. **权限最小化**：
   ```javascript
   // 只请求必要的权限
   const permissions = {
     fileSystem: {
       read: [app.getPath('documents')],
       write: [app.getPath('temp')]
     },
     network: {
       domains: ['api.example.com']
     }
   };
   ```

## 示例插件

### 简单计算器插件

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>计算器</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
    }
    .calculator {
      max-width: 300px;
      margin: 0 auto;
    }
    .display {
      background: #f0f0f0;
      padding: 10px;
      margin-bottom: 10px;
      text-align: right;
      font-size: 18px;
    }
    .buttons {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 5px;
    }
    button {
      padding: 10px;
      font-size: 16px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="calculator">
    <div class="display" id="display">0</div>
    <div class="buttons">
      <button onclick="clearDisplay()">C</button>
      <button onclick="appendToDisplay('/')">/</button>
      <button onclick="appendToDisplay('*')">*</button>
      <button onclick="appendToDisplay('-')">-</button>
      <button onclick="appendToDisplay('7')">7</button>
      <button onclick="appendToDisplay('8')">8</button>
      <button onclick="appendToDisplay('9')">9</button>
      <button onclick="appendToDisplay('+')">+</button>
      <button onclick="appendToDisplay('4')">4</button>
      <button onclick="appendToDisplay('5')">5</button>
      <button onclick="appendToDisplay('6')">6</button>
      <button onclick="calculate()">=</button>
      <button onclick="appendToDisplay('1')">1</button>
      <button onclick="appendToDisplay('2')">2</button>
      <button onclick="appendToDisplay('3')">3</button>
      <button onclick="appendToDisplay('0')">0</button>
      <button onclick="appendToDisplay('.')">.</button>
    </div>
  </div>

  <script>
    const { api } = window.rubick;
    let display = document.getElementById('display');
    let currentInput = '0';
    let shouldResetDisplay = false;

    function updateDisplay() {
      display.textContent = currentInput;
    }

    function clearDisplay() {
      currentInput = '0';
      updateDisplay();
    }

    function appendToDisplay(value) {
      if (shouldResetDisplay) {
        currentInput = '0';
        shouldResetDisplay = false;
      }
      
      if (currentInput === '0' && value !== '.') {
        currentInput = value;
      } else {
        currentInput += value;
      }
      
      updateDisplay();
    }

    function calculate() {
      try {
        const result = eval(currentInput);
        currentInput = result.toString();
        shouldResetDisplay = true;
        updateDisplay();
        
        // 复制结果到剪贴板
        api.copyText({
          text: result.toString()
        });
        
        // 显示通知
        api.showNotification({
          body: `计算结果: ${result} (已复制到剪贴板)`
        });
      } catch (error) {
        api.showNotification({
          body: '计算错误，请检查输入'
        });
      }
    }

    // 监听键盘事件
    document.addEventListener('keydown', (event) => {
      if (event.key >= '0' && event.key <= '9') {
        appendToDisplay(event.key);
      } else if (event.key === '.') {
        appendToDisplay('.');
      } else if (event.key === '+' || event.key === '-' || 
                 event.key === '*' || event.key === '/') {
        appendToDisplay(event.key);
      } else if (event.key === 'Enter' || event.key === '=') {
        calculate();
      } else if (event.key === 'Escape' || event.key === 'c' || event.key === 'C') {
        clearDisplay();
      }
    });

    // 初始化
    updateDisplay();
  </script>
</body>
</html>
```

### 插件配置

```json
{
  "name": "rubick-calculator",
  "pluginName": "计算器",
  "description": "一个简单的计算器插件",
  "version": "1.0.0",
  "author": "Your Name",
  "logo": "https://cdn.jsdelivr.net/npm/rubick-calculator/icon.png",
  "main": "index.html",
  "features": [
    {
      "code": "calculator",
      "explain": "打开计算器",
      "cmds": ["calculator", "calc", "计算器"],
      "icon": "https://cdn.jsdelivr.net/npm/rubick-calculator/icon.png"
    }
  ],
  "pluginType": "ui",
  "platform": ["win32", "darwin", "linux"],
  "keywords": ["rubick", "plugin", "calculator", "计算器"]
}
```

## 更多资源

- [Rubick Plugin CLI](https://github.com/rubickCenter/rubick-plugin-cli)
- [API 文档](./api.md)
- [架构设计](./architecture.md)
- [项目概述](./overview.md)
- [Rubick 插件仓库](https://gitee.com/rubick-center)