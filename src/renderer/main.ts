// 全局错误兜底，避免“Script failed to execute”导致页面白屏
window.addEventListener('error', (event) => {
  try {
    // 在控制台打印详细错误，便于定位
    console.error('[RendererError]', event.error || event.message || event);
  } catch (err) {
    console.error('[RendererErrorCatch]', err);
  }
});

window.addEventListener('unhandledrejection', (event) => {
  try {
    // 阻止默认未处理拒绝的终止行为，打印原因
    event.preventDefault();
    console.error('[UnhandledRejection]', event.reason);
  } catch (err) {
    console.error('[UnhandledRejectionCatch]', err);
  }
});
import { createApp } from 'vue';
import {
  Button,
  List,
  Spin,
  Input,
  Avatar,
  Tag,
  ConfigProvider,
  Row,
  Col,
  Divider,
} from 'ant-design-vue';
import App from './App.vue';
import localConfig from './confOp';

import 'ant-design-vue/dist/antd.variable.min.css';

const config: any = localConfig.getConfig();

ConfigProvider.config({
  theme: config?.perf?.custom || {},
});

;(window as any).rubick = (window as any).rubick || {};
window.rubick.changeTheme = () => {
  const config: any = localConfig.getConfig();
  ConfigProvider.config({
    theme: config?.perf?.custom || {},
  });
};

createApp(App)
  .use(Button)
  .use(List)
  .use(Spin)
  .use(Input)
  .use(Avatar)
  .use(Tag)
  .use(Row)
  .use(Col)
  .use(Divider)
  .mount('#app');

// 兼容主进程注入的全局函数，避免渲染器执行 window.setSubInput 等时报错
// 后续可与搜索占位/子输入框逻辑打通，这里先提供安全兜底以消除运行时异常
;(window as any).setSubInput = ({ placeholder }: { placeholder?: string }) => {
  // 预留：可通过事件或全局状态更新 Search 占位符
};

;(window as any).setSubInputValue = ({ value }: { value: string }) => {
  const el = document.getElementById('search') as HTMLInputElement | null;
  if (el) {
    el.value = value ?? '';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
};

;(window as any).removeSubInput = () => {
  // 预留：可在此处移除子输入 UI
};

;(window as any).setPosition = (pos: number) => {
  // 预留：可根据 pos 调整结果区块位置
};

;(window as any).getMainInputInfo = () => {
  const el = document.getElementById('search') as HTMLInputElement | null;
  return {
    value: el?.value || '',
    placeholder: el?.placeholder || '',
    isFocus: !!el && document.activeElement === el,
  };
};
