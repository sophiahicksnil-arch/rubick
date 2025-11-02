# Rubick 架构设计

## 整体架构

Rubick 采用基于 Electron 的桌面应用架构，结合了主进程和渲染进程的分离设计，实现了插件化的功能扩展机制。

### 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                        用户界面层                            │
├─────────────────────────────────────────────────────────────┤
│  主窗口  │  插件窗口  │  设置窗口  │  独立窗口  │  引导窗口  │
├─────────────────────────────────────────────────────────────┤
│                      渲染进程层                              │
├─────────────────────────────────────────────────────────────┤
│  Vue 组件  │  搜索系统  │  插件管理  │  UI 交互  │  状态管理  │
├─────────────────────────────────────────────────────────────┤
│                      IPC 通信层                             │
├─────────────────────────────────────────────────────────────┤
│                       主进程层                              │
├─────────────────────────────────────────────────────────────┤
│  窗口管理  │  插件系统  │  数据库  │  API 服务  │  系统集成  │
├─────────────────────────────────────────────────────────────┤
│                      系统接口层                             │
├─────────────────────────────────────────────────────────────┤
│  文件系统  │  剪贴板  │  网络  │  通知  │  快捷键  │  截图  │
└─────────────────────────────────────────────────────────────┘
```

## 进程架构

### 主进程 (Main Process)

主进程是 Rubick 的核心控制中心，负责应用的生命周期管理和系统级操作。

**主要职责**：

- 应用启动和退出管理
- 窗口创建和管理
- 系统集成（快捷键、托盘等）
- 插件生命周期管理
- 数据库操作
- 文件系统访问
- 网络请求处理

**核心模块**：

1. **应用管理器** ([`src/main/index.ts`](../../src/main/index.ts:1))
   - 应用启动和初始化
   - 单实例检查
   - 事件监听和处理

2. **窗口管理器** ([`src/main/browsers/index.ts`](../../src/main/browsers/index.ts:1))
   - 主窗口创建和管理
   - 插件窗口管理
   - 窗口状态维护

3. **插件管理器** ([`src/core/plugin-handler/index.ts`](../../src/core/plugin-handler/index.ts:1))
   - 插件安装和卸载
   - 插件生命周期管理
   - 插件环境隔离

4. **API 服务** ([`src/main/common/api.ts`](../../src/main/common/api.ts:1))
   - IPC 请求处理
   - 系统 API 封装
   - 插件 API 提供

### 渲染进程 (Renderer Process)

渲染进程负责用户界面的展示和交互，每个窗口都有独立的渲染进程。

**主要职责**：

- 用户界面渲染
- 用户交互处理
- 搜索功能实现
- 插件界面展示
- 状态管理

**核心模块**：

1. **主界面** ([`src/renderer/App.vue`](../../src/renderer/App.vue:1))
   - 搜索框和结果显示
   - 插件市场入口
   - 用户交互处理

2. **搜索系统** ([`src/renderer/plugins-manager/options.ts`](../../src/renderer/plugins-manager/options.ts:1))
   - 应用搜索
   - 插件搜索
   - 文件搜索
   - 结果排序和过滤

3. **插件管理界面** ([`src/renderer/plugins-manager/`](../../src/renderer/plugins-manager/))
   - 插件市场界面
   - 已安装插件管理
   - 插件配置界面

## 插件架构

### 插件类型

#### 1. UI 插件

UI 插件运行在独立的 BrowserView 中，提供特定的用户界面和功能。

**特点**：
- 安装后立即可用
- 运行在沙箱环境中
- 通过 IPC 与主进程通信
- 可以有自己的界面和交互

**生命周期**：
```
安装 → 加载 → 初始化 → 运行 → 销毁
```

#### 2. 系统插件

系统插件集成到 Rubick 核心系统中，可以修改和扩展系统行为。

**特点**：
- 需要重启 Rubick 后生效
- 可以访问更多系统 API
- 可以修改 Rubick 核心行为
- 通常用于系统级功能增强

**生命周期**：
```
安装 → 系统重启 → 初始化 → 运行 → 卸载 → 系统重启
```

### 插件运行环境

#### UI 插件运行环境

```
┌─────────────────────────────────────────┐
│           BrowserView                 │
├─────────────────────────────────────────┤
│         插件 HTML/CSS/JS             │
├─────────────────────────────────────────┤
│         插件 API 接口                │
├─────────────────────────────────────────┤
│         IPC 通信通道                  │
├─────────────────────────────────────────┤
│           主进程 API                  │
└─────────────────────────────────────────┘
```

#### 系统插件运行环境

```
┌─────────────────────────────────────────┐
│         主进程环境                    │
├─────────────────────────────────────────┤
│         系统插件代码                  │
├─────────────────────────────────────────┤
│         系统 API 访问                │
├─────────────────────────────────────────┤
│         核心系统集成                  │
└─────────────────────────────────────────┘
```

## 数据架构

### 数据存储

Rubick 使用 PouchDB 作为本地数据库，支持离线存储和在线同步。

#### 数据库结构

```
Rubick Database
├── 插件数据
│   ├── 插件配置
│   ├── 插件状态
│   └── 插件用户数据
├── 应用数据
│   ├── 应用列表
│   ├── 使用历史
│   └── 应用配置
├── 用户配置
│   ├── 系统设置
│   ├── 快捷键配置
│   └── 界面配置
└── 同步数据
    ├── 同步配置
    ├── 同步状态
    └── 同步日志
```

#### 数据同步

```
本地数据库 ←→ WebDAV 服务器 ←→ 其他设备
```

### 数据流

#### 搜索数据流

```
用户输入 → 搜索处理 → 并行查询 → 结果合并 → 排序过滤 → 界面显示
    ↓         ↓         ↓         ↓         ↓         ↓
  输入框   搜索引擎   应用搜索   插件搜索   文件搜索   结果列表
                     插件搜索   历史搜索   排序算法   UI 渲染
                     文件搜索
```

#### 插件执行数据流

```
用户选择 → 插件加载 → 环境创建 → 插件执行 → 结果返回 → 界面更新
    ↓         ↓         ↓         ↓         ↓         ↓
  结果项   插件管理   BrowserView  插件代码   IPC 通信   UI 更新
                     系统集成     插件 API   数据处理
```

## 通信架构

### IPC 通信

Rubick 使用 Electron 的 IPC (Inter-Process Communication) 机制实现主进程和渲染进程之间的通信。

#### 通信模式

1. **请求-响应模式**
   ```
   渲染进程 → IPC 请求 → 主进程处理 → IPC 响应 → 渲染进程
   ```

2. **事件发布-订阅模式**
   ```
   主进程/渲染进程 → 事件发布 → IPC 通道 → 事件监听 → 处理函数
   ```

#### API 设计

**主进程 API** ([`src/main/common/api.ts`](../../src/main/common/api.ts:1))：

```typescript
// 窗口管理
windowMoving(data: WindowMoveData): void
showMainWindow(): void
hideMainWindow(): void

// 插件管理
loadPlugin(plugin: PluginData): void
openPlugin(plugin: PluginData): void
removePlugin(): void

// 系统功能
showNotification(data: NotificationData): void
copyText(data: CopyTextData): void
screenCapture(): void
```

**渲染进程 API**：

```typescript
// 插件交互
loadPlugin(plugin: PluginData): void
setCurrentPlugin(plugin: PluginData): void
setSubInput(data: SubInputData): void

// 搜索功能
search(value: string): SearchResult[]
setOptions(options: SearchResult[]): void
```

### 插件通信

#### UI 插件通信

```
插件界面 → 插件 API → IPC 通道 → 主进程 API → 系统功能
    ↑                                              ↓
    └────── IPC 响应 ←────── 主进程处理 ←───────┘
```

#### 系统插件通信

```
系统插件 → 主进程 API → 系统功能
    ↑
    └── 直接调用 ──┘
```

## 安全架构

### 沙箱机制

#### 渲染进程沙箱

- 代码执行受限
- 文件系统访问受限
- 网络访问受限
- 系统 API 访问受限

#### 插件沙箱

- UI 插件运行在独立 BrowserView 中
- 插件间隔离
- API 访问权限控制
- 资源使用限制

### 权限控制

#### 插件权限

```typescript
interface PluginPermissions {
  // 文件系统权限
  fileSystem: {
    read: string[];     // 可读路径
    write: string[];    // 可写路径
  };
  
  // 网络权限
  network: {
    domains: string[];  // 可访问域名
    protocols: string[]; // 可使用协议
  };
  
  // 系统权限
  system: {
    clipboard: boolean;  // 剪贴板访问
    notification: boolean; // 系统通知
    shell: boolean;     // Shell 执行
  };
}
```

#### API 权限

- 敏感 API 需要显式权限声明
- 运行时权限检查
- 用户授权确认

## 性能架构

### 启动性能

#### 启动优化策略

1. **延迟加载**
   - 非核心模块延迟加载
   - 插件按需加载
   - 资源懒加载

2. **缓存机制**
   - 应用列表缓存
   - 插件信息缓存
   - 搜索结果缓存

3. **预编译**
   - 模板预编译
   - 资源预加载
   - 依赖预解析

### 运行时性能

#### 内存管理

- 及时释放不用的资源
- 插件内存使用限制
- 垃圾回收优化

#### 渲染优化

- 虚拟滚动
- DOM 操作优化
- 重绘和回流减少

## 扩展架构

### 插件扩展点

#### 系统扩展点

1. **搜索扩展点**
   - 自定义搜索源
   - 搜索结果处理器
   - 搜索过滤器

2. **UI 扩展点**
   - 自定义主题
   - 界面组件
   - 交互行为

3. **功能扩展点**
   - 系统钩子
   - 事件监听
   - API 扩展

#### 插件 API

```typescript
// 搜索 API
interface SearchAPI {
  registerSearchProvider(provider: SearchProvider): void;
  unregisterSearchProvider(id: string): void;
  search(query: string): Promise<SearchResult[]>;
}

// UI API
interface UIAPI {
  showNotification(message: string, options?: NotificationOptions): void;
  showDialog(options: DialogOptions): Promise<DialogResult>;
  setTheme(theme: Theme): void;
}

// 系统 API
interface SystemAPI {
  openFile(path: string): Promise<void>;
  saveFile(path: string, content: string): Promise<void>;
  executeCommand(command: string): Promise<string>;
}
```

### 平台扩展

#### 平台适配

- 平台特定功能模块
- 条件编译
- 运行时平台检测

#### 平台 API

```typescript
// 平台检测
const platform = {
  isWindows: process.platform === 'win32',
  isMacOS: process.platform === 'darwin',
  isLinux: process.platform === 'linux',
};

// 平台特定 API
const platformAPI = {
  windows: {
    registry: WindowsRegistryAPI,
    shortcuts: WindowsShortcutsAPI,
  },
  macos: {
    applescript: AppleScriptAPI,
    touchbar: TouchBarAPI,
  },
  linux: {
    dbus: DbusAPI,
    x11: X11API,
  },
};
```

## 部署架构

### 构建流程

```
源代码 → 依赖安装 → 代码编译 → 资源打包 → 应用打包 → 签名公证 → 发布分发
```

### 多平台构建

- Windows: NSIS 安装包
- macOS: DMG 镜像文件
- Linux: AppImage 可执行文件

### 自动更新

- 版本检查机制
- 增量更新支持
- 回滚机制

## 监控与诊断

### 日志系统

- 分级日志记录
- 日志轮转
- 错误追踪

### 性能监控

- 启动时间监控
- 内存使用监控
- 插件性能监控

### 错误处理

- 全局错误捕获
- 错误报告机制
- 恢复策略

## 未来架构演进

### 微服务化

- 功能模块微服务化
- 插件服务化
- 分布式架构支持

### 云端集成

- 云端插件市场
- 云端配置同步
- 云端数据备份

### AI 集成

- 智能搜索
- 语音交互
- 智能推荐