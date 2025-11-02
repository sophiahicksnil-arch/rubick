import { app, BrowserWindow, protocol, nativeTheme } from 'electron';
import path from 'path';
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib';
// import versonHandler from '../common/versionHandler';
import localConfig from '@/main/common/initLocalConfig';
import {
  WINDOW_HEIGHT,
  WINDOW_MIN_HEIGHT,
  WINDOW_WIDTH,
} from '@/common/constans/common';
import * as remoteMain from '@electron/remote/main';

export default () => {
  let win: any;

  const init = () => {
    // 确保在主进程初始化 @electron/remote，避免 ipcMain 未定义的报错
    try {
      remoteMain.initialize();
    } catch (e) {
      // 多次 initialize 会抛出错误，忽略二次初始化
    }
    createWindow();
    remoteMain.enable(win.webContents);
  };

  const createWindow = async () => {
    win = new BrowserWindow({
      height: WINDOW_HEIGHT,
      minHeight: WINDOW_MIN_HEIGHT,
      useContentSize: true,
      resizable: true,
      width: WINDOW_WIDTH,
      frame: false,
      title: '拉比克',
      show: false,
      skipTaskbar: true,
      backgroundColor: nativeTheme.shouldUseDarkColors ? '#1c1c28' : '#fff',
      webPreferences: {
        webSecurity: process.env.NODE_ENV === 'development' ? false : true,
        backgroundThrottling: false,
        // 开发环境为解决 require 未定义（WDS 依赖 Node externals），关闭隔离；
        // preload 已做兼容：当关闭隔离时不调用 contextBridge.exposeInMainWorld
        contextIsolation: false,
        webviewTag: true,
        nodeIntegration: true,
        preload: path.join(__static, 'preload.js'),
        spellcheck: false,
        sandbox: false,
      },
    });
    if (process.env.WEBPACK_DEV_SERVER_URL) {
      // Load the url of the dev server if in development mode
      win.loadURL(process.env.WEBPACK_DEV_SERVER_URL as string);
    } else {
      createProtocol('app');
      // Load the index.html when not in development
      win.loadURL('app://./index.html');
    }
    protocol.interceptFileProtocol('image', (req, callback) => {
      const url = req.url.substr(8);
      callback(decodeURI(url));
    });
    win.on('closed', () => {
      win = undefined;
    });

    win.on('show', () => {
      win.webContents.executeJavaScript(
        `window.rubick && window.rubick.hooks && typeof window.rubick.hooks.onShow === "function" && window.rubick.hooks.onShow()`
      );
      // versonHandler.checkUpdate();
      // 开发环境默认不自动打开 DevTools
    });

    win.on('hide', () => {
      win.webContents.executeJavaScript(
        `window.rubick && window.rubick.hooks && typeof window.rubick.hooks.onHide === "function" && window.rubick.hooks.onHide()`
      );
    });

    // 捕获渲染器加载/运行期错误，便于定位 “Script failed to execute”
    win.webContents.on('did-fail-load', (e, code, desc, url) => {
      console.error('[RendererLoadFailed]', { code, desc, url });
    });
    win.webContents.on('render-process-gone', (_event, details) => {
      console.error('[RendererGone]', details);
    });
    win.webContents.on('console-message', (_event, level, message, line, sourceId) => {
      console.log(`[RendererConsole:${level}]`, message, `(${sourceId}:${line})`);
    });

    // 判断失焦是否隐藏
    win.on('blur', async () => {
      const config = await localConfig.getConfig();
      if (config.perf.common.hideOnBlur) {
        win.hide();
      }
    });
  };

  const getWindow = () => win;

  return {
    init,
    getWindow,
  };
};
