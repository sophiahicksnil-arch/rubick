# Rubick 安装指南

## 系统要求

Rubick 支持以下操作系统：

- Windows 10 及以上版本
- macOS 10.14 及以上版本
- Linux (Ubuntu 18.04 及以上版本)

## 下载安装

### 官方下载

您可以从 [GitHub Releases](https://github.com/rubickCenter/rubick/releases) 页面下载最新版本的 Rubick：

- [Rubick Windows 版本](https://github.com/rubickCenter/rubick/releases)
- [Rubick macOS 版本](https://github.com/rubickCenter/rubick/releases)
- [Rubick Linux 版本](https://github.com/rubickCenter/rubick/releases)

### 安装步骤

#### Windows

1. 下载 `rubick-x.x.x.exe` 安装包
2. 双击运行安装程序
3. 按照安装向导完成安装
4. 安装完成后，可以从开始菜单启动 Rubick

#### macOS

1. 下载 `rubick-x.x.x.dmg` 安装包
2. 双击打开 DMG 文件
3. 将 Rubick 拖拽到 Applications 文件夹
4. 在"系统偏好设置 > 安全性与隐私"中允许 Rubick 运行
5. 从 Launchpad 或 Applications 文件夹启动 Rubick

#### Linux

1. 下载 `rubick-x.x.x.AppImage` 文件
2. 添加执行权限：`chmod +x rubick-x.x.x.AppImage`
3. 运行：`./rubick-x.x.x.AppImage`

## 首次启动

安装完成后，您可以通过以下方式启动 Rubick：

1. 从应用程序菜单启动 Rubick
2. 使用快捷键 `Alt+R` (Windows/Linux) 或 `Option+R` (macOS) 快速呼起 Rubick

首次启动时，Rubick 会显示一个简短的引导界面，帮助您了解基本功能。

## 基本配置

### 快捷键设置

默认快捷键为 `Alt+R` (Windows/Linux) 或 `Option+R` (macOS)。您可以在设置中修改快捷键：

1. 在 Rubick 中搜索"偏好设置"
2. 进入"快捷键"选项卡
3. 修改呼起快捷键

### 插件源设置

Rubick 默认使用官方插件源，您可以在设置中修改插件源：

1. 在 Rubick 中搜索"偏好设置"
2. 进入"插件市场"选项卡
3. 修改插件源地址

### 数据同步设置

Rubick 支持 WebDAV 多端数据同步：

1. 在 Rubick 中搜索"偏好设置"
2. 进入"账户和设置" > "多端数据同步"
3. 配置您的 WebDAV 服务器信息

## 常见安装问题

### Windows

**问题：安装时提示"无法验证发布者"**

解决方法：
1. 右键点击安装包，选择"属性"
2. 在"安全"选项卡中点击"仍要运行"
3. 或者通过组策略编辑器启用"开发人员模式"

### macOS

**问题：无法打开 Rubick，提示"来自未识别的开发者"**

解决方法：
1. 打开"系统偏好设置" > "安全性与隐私"
2. 在"通用"选项卡中点击"仍要打开"
3. 或者通过终端命令：`sudo xattr -rd com.apple.quarantine /Applications/Rubick.app`

### Linux

**问题：AppImage 无法运行**

解决方法：
1. 确保文件有执行权限：`chmod +x rubick-x.x.x.AppImage`
2. 安装必要的依赖库：`sudo apt-get install libgtk-3-0 libnotify4 libnss3 libxss1 libxtst6 xdg-utils libatspi2.0-0 libdrm2 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libxkbcommon0 libasound2`

## 下一步

安装完成后，您可以：

1. 阅读[使用指南](./usage.md)了解 Rubick 的基本功能
2. 浏览[插件市场](./plugin-market.md)安装有用的插件
3. 查看[常见问题](./faq.md)解决使用中的问题