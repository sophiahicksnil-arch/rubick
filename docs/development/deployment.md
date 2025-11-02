# Rubick 构建和部署指南

## 概述

本指南介绍如何构建和部署 Rubick 应用程序，包括本地构建、多平台打包、自动更新配置等内容。

## 环境准备

### 系统要求

- Node.js 14.0+
- npm 6.0+
- Git
- 对于跨平台构建，需要相应的构建环境：
  - Windows: Visual Studio Build Tools
  - macOS: Xcode Command Line Tools
  - Linux: build-essential

### 依赖安装

```bash
# 克隆仓库
git clone https://github.com/rubickCenter/rubick.git
cd rubick

# 安装依赖
npm install
```

## 本地开发

### 开发模式启动

```bash
# 启动开发服务器
npm run electron:serve
```

### 开发模式调试

1. **主进程调试**：
   - 使用 VS Code 调试配置
   - 在 `.vscode/launch.json` 中添加配置：

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

2. **渲染进程调试**：
   - 使用 Chrome DevTools
   - 在应用中按 F12 打开开发者工具

## 构建流程

### 构建配置

构建配置主要在 `vue.config.js` 和 `package.json` 中定义。

#### vue.config.js

```javascript
module.exports = {
  pluginOptions: {
    electronBuilder: {
      builderOptions: {
        appId: 'com.rubick.app',
        productName: 'Rubick',
        copyright: 'Copyright © 2023 Rubick Team',
        directories: {
          output: 'dist_electron'
        },
        files: [
          'dist_electron/**/*',
          'node_modules/**/*'
        ],
        mac: {
          category: 'public.app-category.productivity',
          target: [
            {
              target: 'dmg',
              arch: ['x64', 'arm64']
            }
          ]
        },
        win: {
          target: [
            {
              target: 'nsis',
              arch: ['x64']
            }
          ]
        },
        linux: {
          target: [
            {
              target: 'AppImage',
              arch: ['x64']
            }
          ]
        }
      }
    }
  }
};
```

#### package.json 构建脚本

```json
{
  "scripts": {
    "electron:build": "vue-cli-service electron:build",
    "build:win": "vue-cli-service electron:build --win",
    "build:mac": "vue-cli-service electron:build --mac",
    "build:linux": "vue-cli-service electron:build --linux"
  }
}
```

### 本地构建

#### 构建所有平台

```bash
# 构建所有平台
npm run electron:build
```

#### 构建特定平台

```bash
# 构建 Windows 版本
npm run build:win

# 构建 macOS 版本
npm run build:mac

# 构建 Linux 版本
npm run build:linux
```

### 构建产物

构建完成后，产物位于 `dist_electron` 目录：

```
dist_electron/
├── Rubick-1.0.0.dmg          # macOS 安装包
├── Rubick Setup 1.0.0.exe     # Windows 安装包
├── Rubick-1.0.0.AppImage      # Linux 可执行文件
└── ...
```

## 多平台构建

### 使用 GitHub Actions

#### 工作流配置

在 `.github/workflows/build.yml` 中配置：

```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'
  pull_request:
    branches: [ main ]

jobs:
  build:
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
```

### 使用 Docker

#### Dockerfile

```dockerfile
FROM node:16-alpine

# 安装构建依赖
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 构建应用
RUN npm run electron:build

# 设置输出目录
VOLUME ["/app/dist_electron"]

# 默认命令
CMD ["npm", "run", "electron:build"]
```

#### 构建脚本

```bash
#!/bin/bash

# 构建 Docker 镜像
docker build -t rubick-builder .

# 运行构建容器
docker run --rm -v $(pwd)/dist_electron:/app/dist_electron rubick-builder
```

## 自动更新

### 更新配置

在 `src/main/index.ts` 中配置自动更新：

```typescript
import { autoUpdater } from 'electron-updater';

class App {
  constructor() {
    // ...其他初始化代码
    this.setupAutoUpdater();
  }

  setupAutoUpdater() {
    // 检查更新
    autoUpdater.checkForUpdatesAndNotify();
    
    // 监听更新事件
    autoUpdater.on('update-available', () => {
      console.log('Update available');
    });
    
    autoUpdater.on('update-downloaded', () => {
      console.log('Update downloaded');
      autoUpdater.quitAndInstall();
    });
    
    autoUpdater.on('error', (error) => {
      console.error('Update error:', error);
    });
  }
}
```

### 更新服务器配置

#### 使用 GitHub Releases

```typescript
import { autoUpdater } from 'electron-updater';

// 配置更新服务器
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'rubickCenter',
  repo: 'rubick',
  private: false
});
```

#### 使用自定义服务器

```typescript
import { autoUpdater } from 'electron-updater';

// 配置自定义更新服务器
autoUpdater.setFeedURL({
  provider: 'generic',
  url: 'https://updates.example.com/rubick',
  channel: 'latest'
});
```

### 更新检查逻辑

```typescript
// 手动检查更新
function checkForUpdates() {
  autoUpdater.checkForUpdatesAndNotify();
}

// 定期检查更新
setInterval(() => {
  checkForUpdates();
}, 24 * 60 * 60 * 1000); // 每24小时检查一次
```

## 代码签名

### Windows 代码签名

#### 配置签名证书

在 `vue.config.js` 中配置：

```javascript
module.exports = {
  pluginOptions: {
    electronBuilder: {
      builderOptions: {
        win: {
          certificateFile: './cert.p12',
          certificatePassword: process.env.CERT_PASSWORD,
          publisherName: 'Your Company Name'
        }
      }
    }
  }
};
```

#### 签名流程

```bash
# 设置证书密码环境变量
export CERT_PASSWORD="your_certificate_password"

# 构建并签名
npm run build:win
```

### macOS 代码签名

#### 配置签名证书

在 `vue.config.js` 中配置：

```javascript
module.exports = {
  pluginOptions: {
    electronBuilder: {
      builderOptions: {
        mac: {
          identity: 'Developer ID Application: Your Name (TEAM_ID)',
          hardenedRuntime: true,
          entitlements: './build/entitlements.mac.plist',
          entitlementsInherit: './build/entitlements.mac.plist'
        }
      }
    }
  }
};
```

#### 权限文件 (entitlements.mac.plist)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
</dict>
</plist>
```

### 公证 (Notarization)

#### 配置公证

在 `vue.config.js` 中配置：

```javascript
module.exports = {
  pluginOptions: {
    electronBuilder: {
      builderOptions: {
        mac: {
          notarize: {
            teamId: 'YOUR_TEAM_ID',
            appleId: process.env.APPLE_ID,
            appleIdPassword: process.env.APPLE_ID_PASSWORD
          }
        }
      }
    }
  }
};
```

## 发布流程

### 版本管理

#### 语义化版本

使用语义化版本控制 (SemVer)：

- `MAJOR.MINOR.PATCH`
- `MAJOR`: 不兼容的 API 修改
- `MINOR`: 向下兼容的功能性新增
- `PATCH`: 向下兼容的问题修正

#### 版本更新脚本

```bash
#!/bin/bash

# 更新版本号
npm version patch  # 或 minor, major

# 推送标签
git push origin --tags

# 触发构建和发布
```

### 自动发布

#### GitHub Actions 发布配置

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    
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
        
    - name: Create Release
      uses: actions/create-release@v1
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      with:
        tag_name: ${{ github.ref }}
        release_name: Release ${{ github.ref }}
        draft: false
        prerelease: false
        
    - name: Upload Release Assets
      uses: actions/upload-release-asset@v1
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      with:
        upload_url: ${{ steps.create_release.outputs.upload_url }}
        asset_path: ./dist_electron/Rubick-1.0.0.dmg
        asset_name: Rubick-1.0.0.dmg
        asset_content_type: application/octet-stream
```

### 手动发布

#### 发布步骤

1. **更新版本号**：
   ```bash
   npm version patch
   ```

2. **构建应用**：
   ```bash
   npm run electron:build
   ```

3. **创建 GitHub Release**：
   - 访问 GitHub Releases 页面
   - 点击 "Create a new release"
   - 选择刚创建的标签
   - 上传构建产物
   - 填写发布说明

4. **更新下载链接**：
   - 更新官网下载链接
   - 更新 README 中的下载链接

## 企业内网部署

### 内网插件源

#### 搭建 npm 私有仓库

使用 Verdaccio 搭建私有 npm 仓库：

```bash
# 安装 Verdaccio
npm install -g verdaccio

# 启动 Verdaccio
verdaccio

# 配置 Rubick 使用私有仓库
npm config set registry http://your-private-registry:4873
```

#### 插件源配置

在 Rubick 设置中配置插件源：

```javascript
// 在偏好设置中配置
const config = {
  register: 'http://your-private-registry:4873'
};
```

### 内网更新服务器

#### 搭建更新服务器

使用 Node.js 搭建简单的更新服务器：

```javascript
// update-server.js
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// 静态文件服务
app.use('/updates', express.static(path.join(__dirname, 'updates')));

// 版本信息 API
app.get('/updates/version', (req, res) => {
  const version = fs.readFileSync('./version.json', 'utf8');
  res.json(JSON.parse(version));
});

// 下载文件
app.get('/updates/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'updates', filename);
  
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).send('File not found');
  }
});

app.listen(port, () => {
  console.log(`Update server running at http://localhost:${port}`);
});
```

#### 版本信息文件

```json
// version.json
{
  "version": "1.0.0",
  "files": {
    "win": "Rubick-1.0.0.exe",
    "mac": "Rubick-1.0.0.dmg",
    "linux": "Rubick-1.0.0.AppImage"
  },
  "releaseNotes": "Bug fixes and improvements",
  "releaseDate": "2023-01-01"
}
```

### 内网部署策略

#### 集中部署

1. **构建应用**：
   ```bash
   npm run electron:build
   ```

2. **上传到内网服务器**：
   ```bash
   scp dist_electron/* user@internal-server:/path/to/rubick/
   ```

3. **配置自动更新**：
   ```javascript
   autoUpdater.setFeedURL({
     provider: 'generic',
     url: 'http://internal-server/rubick/updates'
   });
   ```

#### 分发策略

1. **网络共享**：
   - 将安装包放在网络共享目录
   - 用户自行下载安装

2. **组策略**（Windows）：
   - 使用组策略推送安装包
   - 自动安装和更新

3. **脚本部署**：
   ```bash
   # deploy.sh
   #!/bin/bash
   
   # 检查是否已安装
   if [ ! -d "/Applications/Rubick.app" ]; then
     # 下载并安装
     curl -O http://internal-server/rubick/Rubick-1.0.0.dmg
     hdiutil attach Rubick-1.0.0.dmg
     cp -r /Volumes/Rubick/Rubick.app /Applications/
     hdiutil detach /Volumes/Rubick
   fi
   ```

## 性能优化

### 构建优化

#### 依赖优化

```json
// package.json
{
  "devDependencies": {
    "electron-builder": "^22.11.7"
  },
  "dependencies": {
    "core-js": "^3.6.5"
  }
}
```

#### 资源优化

```javascript
// vue.config.js
module.exports = {
  pluginOptions: {
    electronBuilder: {
      builderOptions: {
        compression: 'maximum',
        files: [
          'dist_electron/**/*',
          '!dist_electron/node_modules/**/*',
          'node_modules/**/*'
        ]
      }
    }
  }
};
```

### 运行时优化

#### 启动优化

```typescript
// src/main/index.ts
class App {
  constructor() {
    // 延迟加载非核心模块
    setTimeout(() => {
      this.loadNonCriticalModules();
    }, 1000);
  }
  
  loadNonCriticalModules() {
    // 加载非核心模块
  }
}
```

#### 内存优化

```typescript
// src/main/index.ts
class App {
  constructor() {
    // 监听内存使用
    setInterval(() => {
      const memUsage = process.memoryUsage();
      console.log('Memory usage:', memUsage);
    }, 30000);
  }
}
```

## 监控和日志

### 错误监控

#### 集成 Sentry

```typescript
// src/main/index.ts
import * as Sentry from '@sentry/electron';

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
  environment: process.env.NODE_ENV
});
```

### 日志系统

#### 日志配置

```typescript
// src/common/utils/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

export default logger;
```

## 故障排除

### 常见构建问题

#### 依赖安装失败

```bash
# 清理缓存
npm cache clean --force

# 删除 node_modules
rm -rf node_modules

# 重新安装
npm install
```

#### 构建失败

```bash
# 检查 Node.js 版本
node --version

# 检查 npm 版本
npm --version

# 更新构建工具
npm update
```

#### 平台特定问题

**Windows**：
- 安装 Visual Studio Build Tools
- 设置环境变量 `npm_config_python=python2`

**macOS**：
- 安装 Xcode Command Line Tools
- 设置环境变量 `CXX=clang++`

**Linux**：
- 安装 build-essential
- 安装 libnss3-dev

### 调试技巧

#### 主进程调试

```bash
# 启动调试模式
npm run electron:serve -- --inspect=5858

# 使用 Chrome DevTools 连接
chrome://inspect
```

#### 渲染进程调试

```javascript
// 在渲染进程中
console.log('Debug info');
debugger; // 设置断点
```

## 更多资源

- [Electron 官方文档](https://electronjs.org/docs)
- [Electron Builder 文档](https://electron.build/)
- [Vue CLI 插件 Electron Builder](https://github.com/nklayman/vue-cli-plugin-electron-builder)
- [GitHub Actions 文档](https://docs.github.com/en/actions)