# Rubick API 文档

## API 概述

Rubick 提供了丰富的 API 供插件开发者使用，包括窗口管理、系统功能、文件操作、网络请求等多个方面。这些 API 通过 IPC (Inter-Process Communication) 机制在主进程和渲染进程之间进行通信。

## 主进程 API

主进程 API 主要在 [`src/main/common/api.ts`](../../src/main/common/api.ts:1) 中定义，负责处理来自渲染进程的请求。

### 窗口管理 API

#### windowMoving

移动窗口位置。

```typescript
windowMoving(data: {
  mouseX: number;
  mouseY: number;
  width: number;
  height: number;
}): void
```

**参数**：
- `mouseX`: 鼠标 X 坐标
- `mouseY`: 鼠标 Y 坐标
- `width`: 窗口宽度
- `height`: 窗口高度

**示例**：
```javascript
// 移动窗口到鼠标位置
api.windowMoving({
  mouseX: 100,
  mouseY: 200,
  width: 800,
  height: 600
});
```

#### showMainWindow / hideMainWindow

显示或隐藏主窗口。

```typescript
showMainWindow(): void
hideMainWindow(): void
```

**示例**：
```javascript
// 显示主窗口
api.showMainWindow();

// 隐藏主窗口
api.hideMainWindow();
```

#### setExpendHeight

设置窗口扩展高度。

```typescript
setExpendHeight(height: number): void
```

**参数**：
- `height`: 目标高度

**示例**：
```javascript
// 设置窗口高度为 400 像素
api.setExpendHeight(400);
```

### 插件管理 API

#### loadPlugin

加载插件。

```typescript
loadPlugin(plugin: PluginData): void
```

**参数**：
- `plugin`: 插件数据对象

**示例**：
```javascript
// 加载插件
api.loadPlugin({
  name: 'example-plugin',
  logo: 'path/to/logo.png',
  main: 'index.html',
  features: []
});
```

#### openPlugin

打开插件。

```typescript
openPlugin(plugin: PluginData): void
```

**参数**：
- `plugin`: 插件数据对象

**示例**：
```javascript
// 打开插件
api.openPlugin({
  name: 'example-plugin',
  logo: 'path/to/logo.png',
  main: 'index.html',
  features: []
});
```

#### removePlugin

移除当前插件。

```typescript
removePlugin(): void
```

**示例**：
```javascript
// 移除当前插件
api.removePlugin();
```

#### detachPlugin

分离插件到独立窗口。

```typescript
detachPlugin(): void
```

**示例**：
```javascript
// 将插件分离到独立窗口
api.detachPlugin();
```

### 系统功能 API

#### showNotification

显示系统通知。

```typescript
showNotification(data: {
  body: string;
}): void
```

**参数**：
- `body`: 通知内容

**示例**：
```javascript
// 显示通知
api.showNotification({
  body: '操作完成！'
});
```

#### copyText

复制文本到剪贴板。

```typescript
copyText(data: {
  text: string;
}): boolean
```

**参数**：
- `text`: 要复制的文本

**返回值**：
- `boolean`: 复制是否成功

**示例**：
```javascript
// 复制文本
const success = api.copyText({
  text: 'Hello, Rubick!'
});
```

#### copyImage

复制图片到剪贴板。

```typescript
copyImage(data: {
  img: string; // Data URL
}): void
```

**参数**：
- `img`: 图片的 Data URL

**示例**：
```javascript
// 复制图片
api.copyImage({
  img: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...'
});
```

#### copyFile

复制文件到剪贴板。

```typescript
copyFile(data: {
  file: string;
}): boolean
```

**参数**：
- `file`: 文件路径

**返回值**：
- `boolean`: 复制是否成功

**示例**：
```javascript
// 复制文件
const success = api.copyFile({
  file: '/path/to/file.txt'
});
```

#### screenCapture

执行截图功能。

```typescript
screenCapture(): void
```

**示例**：
```javascript
// 执行截图
api.screenCapture();
```

#### shellShowItemInFolder

在文件管理器中显示文件。

```typescript
shellShowItemInFolder(data: {
  path: string;
}): boolean
```

**参数**：
- `path`: 文件路径

**返回值**：
- `boolean`: 操作是否成功

**示例**：
```javascript
// 在文件管理器中显示文件
const success = api.shellShowItemInFolder({
  path: '/path/to/file.txt'
});
```

#### getFileIcon

获取文件图标。

```typescript
getFileIcon(data: {
  path: string;
}): Promise<string>
```

**参数**：
- `path`: 文件路径

**返回值**：
- `Promise<string>`: 文件图标的 Data URL

**示例**：
```javascript
// 获取文件图标
const icon = await api.getFileIcon({
  path: '/path/to/file.txt'
});
```

#### simulateKeyboardTap

模拟键盘按键。

```typescript
simulateKeyboardTap(data: {
  key: string;
  modifier?: string[];
}): void
```

**参数**：
- `key`: 按键名称
- `modifier`: 修饰键数组（可选）

**示例**：
```javascript
// 模拟按键
api.simulateKeyboardTap({
  key: 'a',
  modifier: ['ctrl', 'shift']
});
```

### 文件操作 API

#### showOpenDialog

显示文件打开对话框。

```typescript
showOpenDialog(data: OpenDialogOptions): string[]
```

**参数**：
- `data`: 对话框选项

**返回值**：
- `string[]`: 选择的文件路径数组

**示例**：
```javascript
// 显示文件打开对话框
const files = api.showOpenDialog({
  title: '选择文件',
  filters: [
    { name: 'Text Files', extensions: ['txt'] },
    { name: 'All Files', extensions: ['*'] }
  ]
});
```

#### showSaveDialog

显示文件保存对话框。

```typescript
showSaveDialog(data: SaveDialogOptions): string
```

**参数**：
- `data`: 对话框选项

**返回值**：
- `string`: 选择的文件路径

**示例**：
```javascript
// 显示文件保存对话框
const filePath = api.showSaveDialog({
  title: '保存文件',
  defaultPath: 'untitled.txt',
  filters: [
    { name: 'Text Files', extensions: ['txt'] },
    { name: 'All Files', extensions: ['*'] }
  ]
});
```

#### getPath

获取系统路径。

```typescript
getPath(data: {
  name: string;
}): string
```

**参数**：
- `name`: 路径名称（如 'home', 'documents', 'downloads' 等）

**返回值**：
- `string`: 系统路径

**示例**：
```javascript
// 获取用户主目录
const homePath = api.getPath({
  name: 'home'
});

// 获取文档目录
const documentsPath = api.getPath({
  name: 'documents'
});
```

### 插件功能 API

#### setSubInput

设置子输入框。

```typescript
setSubInput(data: {
  placeholder: string;
}): void
```

**参数**：
- `placeholder`: 输入框占位符

**示例**：
```javascript
// 设置子输入框
api.setSubInput({
  placeholder: '请输入搜索关键词'
});
```

#### removeSubInput

移除子输入框。

```typescript
removeSubInput(): void
```

**示例**：
```javascript
// 移除子输入框
api.removeSubInput();
```

#### setSubInputValue

设置子输入框的值。

```typescript
setSubInputValue(data: {
  text: string;
}): void
```

**参数**：
- `text`: 输入框文本

**示例**：
```javascript
// 设置子输入框的值
api.setSubInputValue({
  text: 'Hello, World!'
});
```

#### setFeature

设置插件功能。

```typescript
setFeature(data: {
  feature: FeatureData;
}): boolean
```

**参数**：
- `feature`: 功能数据对象

**返回值**：
- `boolean`: 设置是否成功

**示例**：
```javascript
// 设置插件功能
const success = api.setFeature({
  feature: {
    code: 'example-feature',
    explain: '示例功能',
    cmds: ['example'],
    icon: 'path/to/icon.png'
  }
});
```

#### removeFeature

移除插件功能。

```typescript
removeFeature(data: {
  code: string | { type: string };
}): boolean
```

**参数**：
- `code`: 功能代码或类型对象

**返回值**：
- `boolean`: 移除是否成功

**示例**：
```javascript
// 移除插件功能
const success = api.removeFeature({
  code: 'example-feature'
});
```

## 渲染进程 API

渲染进程 API 主要在渲染进程中使用，用于与主进程通信和操作界面。

### 插件交互 API

#### loadPlugin

加载插件。

```typescript
loadPlugin(plugin: PluginData): void
```

**参数**：
- `plugin`: 插件数据对象

**示例**：
```javascript
// 加载插件
window.loadPlugin({
  name: 'example-plugin',
  logo: 'path/to/logo.png',
  main: 'index.html',
  features: []
});
```

#### setCurrentPlugin

设置当前插件。

```typescript
setCurrentPlugin(data: {
  currentPlugin: PluginData;
}): void
```

**参数**：
- `currentPlugin`: 当前插件数据对象

**示例**：
```javascript
// 设置当前插件
window.setCurrentPlugin({
  currentPlugin: {
    name: 'example-plugin',
    logo: 'path/to/logo.png',
    features: []
  }
});
```

#### updatePlugin

更新插件信息。

```typescript
updatePlugin(data: {
  currentPlugin: PluginData;
}): void
```

**参数**：
- `currentPlugin`: 更新后的插件数据对象

**示例**：
```javascript
// 更新插件信息
window.updatePlugin({
  currentPlugin: {
    name: 'example-plugin',
    logo: 'path/to/logo.png',
    features: [
      {
        code: 'new-feature',
        explain: '新功能',
        cmds: ['new']
      }
    ]
  }
});
```

### 搜索功能 API

#### search

执行搜索。

```typescript
search(value: string): SearchResult[]
```

**参数**：
- `value`: 搜索关键词

**返回值**：
- `SearchResult[]`: 搜索结果数组

**示例**：
```javascript
// 执行搜索
const results = window.search('example');
```

#### setOptions

设置搜索选项。

```typescript
setOptions(options: SearchResult[]): void
```

**参数**：
- `options`: 搜索结果数组

**示例**：
```javascript
// 设置搜索选项
window.setOptions([
  {
    name: 'Example',
    value: 'plugin',
    icon: 'path/to/icon.png',
    desc: '示例插件',
    click: () => console.log('Clicked!')
  }
]);
```

### 界面操作 API

#### setSubInput

设置子输入框。

```typescript
setSubInput(data: {
  placeholder: string;
}): void
```

**参数**：
- `placeholder`: 输入框占位符

**示例**：
```javascript
// 设置子输入框
window.setSubInput({
  placeholder: '请输入搜索关键词'
});
```

#### removeSubInput

移除子输入框。

```typescript
removeSubInput(): void
```

**示例**：
```javascript
// 移除子输入框
window.removeSubInput();
```

#### setSubInputValue

设置子输入框的值。

```typescript
setSubInputValue(data: {
  value: string;
}): void
```

**参数**：
- `value`: 输入框文本

**示例**：
```javascript
// 设置子输入框的值
window.setSubInputValue({
  value: 'Hello, World!'
});
```

#### setPosition

设置窗口位置。

```typescript
setPosition(position: number): void
```

**参数**：
- `position`: 位置偏移量

**示例**：
```javascript
// 设置窗口位置
window.setPosition(100);
```

#### initRubick

初始化 Rubick 界面。

```typescript
initRubick(): void
```

**示例**：
```javascript
// 初始化 Rubick 界面
window.initRubick();
```

#### getMainInputInfo

获取主输入框信息。

```typescript
getMainInputInfo(): MainInputInfo
```

**返回值**：
- `MainInputInfo`: 主输入框信息对象

**示例**：
```javascript
// 获取主输入框信息
const inputInfo = window.getMainInputInfo();
```

### 插件管理 API

#### addLocalStartPlugin

添加本地启动插件。

```typescript
addLocalStartPlugin(data: {
  plugin: PluginData;
}): void
```

**参数**：
- `plugin`: 插件数据对象

**示例**：
```javascript
// 添加本地启动插件
window.addLocalStartPlugin({
  plugin: {
    name: 'example-plugin',
    logo: 'path/to/logo.png',
    features: []
  }
});
```

#### removeLocalStartPlugin

移除本地启动插件。

```typescript
removeLocalStartPlugin(data: {
  plugin: PluginData;
}): void
```

**参数**：
- `plugin`: 插件数据对象

**示例**：
```javascript
// 移除本地启动插件
window.removeLocalStartPlugin({
  plugin: {
    name: 'example-plugin',
    logo: 'path/to/logo.png',
    features: []
  }
});
```

## 数据类型定义

### PluginData

```typescript
interface PluginData {
  name: string;           // 插件名称
  logo: string;           // 插件图标路径
  main?: string;          // 插件主文件路径
  features?: FeatureData[]; // 插件功能列表
  pluginType?: string;    // 插件类型
  platform?: string[];    // 支持的平台
  indexPath?: string;     // 插件入口路径
  tplPath?: string;       // 模板路径
}
```

### FeatureData

```typescript
interface FeatureData {
  code: string;           // 功能代码
  explain: string;        // 功能说明
  cmds: string[];         // 命令列表
  icon?: string;          // 功能图标
  type?: string;          // 功能类型
}
```

### SearchResult

```typescript
interface SearchResult {
  name: string;           // 结果名称
  value: string;          // 结果值
  icon: string;           // 结果图标
  desc?: string;          // 结果描述
  type?: string;          // 结果类型
  match?: [number, number]; // 匹配位置
  zIndex?: number;        // 排序权重
  isBestMatch?: boolean;  // 是否为最佳匹配
  click: () => void;      // 点击回调
}
```

### OpenDialogOptions

```typescript
interface OpenDialogOptions {
  title?: string;         // 对话框标题
  defaultPath?: string;   // 默认路径
  filters?: FileFilter[]; // 文件过滤器
  properties?: string[];  // 对话框属性
}
```

### SaveDialogOptions

```typescript
interface SaveDialogOptions {
  title?: string;         // 对话框标题
  defaultPath?: string;   // 默认路径
  filters?: FileFilter[]; // 文件过滤器
}
```

### FileFilter

```typescript
interface FileFilter {
  name: string;           // 过滤器名称
  extensions: string[];   // 文件扩展名
}
```

## IPC 通信

### 请求-响应模式

渲染进程向主进程发送请求并等待响应：

```javascript
// 渲染进程
const result = ipcRenderer.sendSync('msg-trigger', {
  type: 'showNotification',
  data: { body: 'Hello, World!' }
});

// 主进程
ipcMain.on('msg-trigger', async (event, arg) => {
  const data = await api[arg.type](arg.data);
  event.returnValue = data;
});
```

### 事件发布-订阅模式

主进程向渲染进程发送事件：

```javascript
// 主进程
mainWindow.webContents.send('plugin-event', {
  type: 'update',
  data: { status: 'loaded' }
});

// 渲染进程
ipcRenderer.on('plugin-event', (event, data) => {
  console.log('Received event:', data);
});
```

## 错误处理

### API 错误处理

```javascript
try {
  const result = api.someFunction(data);
  // 处理成功结果
} catch (error) {
  // 处理错误
  console.error('API Error:', error);
}
```

### IPC 错误处理

```javascript
// 渲染进程
try {
  const result = ipcRenderer.sendSync('msg-trigger', {
    type: 'someFunction',
    data: {}
  });
  // 处理成功结果
} catch (error) {
  // 处理错误
  console.error('IPC Error:', error);
}

// 主进程
ipcMain.on('msg-trigger', async (event, arg) => {
  try {
    const data = await api[arg.type](arg.data);
    event.returnValue = { success: true, data };
  } catch (error) {
    event.returnValue = { success: false, error: error.message };
  }
});
```

## 最佳实践

1. **错误处理**：始终使用 try-catch 处理 API 调用错误
2. **参数验证**：在调用 API 前验证参数的有效性
3. **异步操作**：对于耗时操作，使用异步 API 并提供适当的用户反馈
4. **资源管理**：及时释放不再使用的资源
5. **权限检查**：在访问敏感功能前检查权限

## 更多资源

- [插件开发指南](./plugin-development.md)
- [架构设计](./architecture.md)
- [项目概述](./overview.md)