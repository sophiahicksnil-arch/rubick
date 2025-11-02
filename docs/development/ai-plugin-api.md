# Rubick 插件 AI API 参考（window.rubick.ai）

本文件为插件侧调用 Rubick 基座 AI 能力的权威参考。配合基座集成文档与设置文档使用：
- 基座集成与架构：[docs/development/ai-integration.md](docs/development/ai-integration.md)
- 设置页接入与管理：[docs/guide/ai-settings.md](docs/guide/ai-settings.md)
- 主进程路由挂载点与事件派发： [API.init()](src/main/common/api.ts:35)、[ipcMain.on](src/main/common/api.ts:37)、[sendPluginSomeKeyDownEvent()](src/main/common/api.ts:288)

## 总览
- 入口：`window.rubick.ai`
- 统一封装多 Provider（OpenAI、Azure OpenAI、Anthropic、Gemini、通义千问、文心、Ollama、OpenAI 兼容）
- 支持能力：
  - 文本生成：`invoke`（非流式）、`stream`（流式）
  - 向量嵌入：`embed`
  - 图像生成：`image.generate`
  - 语音转文字（可选）：`speech.transcribe`
- Provider 选择优先级：入参.provider > 配置 defaultProvider（见 rubick-ai-config）
- 安全：密钥仅在主进程/数据库存储，渲染层不暴露原始密钥；建议使用 preload 暴露白名单 API，逐步收紧窗口安全策略参考 [BrowserWindow.webPreferences](src/main/browsers/main.ts:35)

## TypeScript 接口（建议约定）
以下接口用于描述插件侧调用的入参/出参类型（示例约定，供实现时对齐）。

```ts
// 消息体
export interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

// 通用调用选项
export interface AIBaseOptions {
  provider?: string;           // 如 'openai'、'azureOpenAI'、'anthropic' 等
  model?: string;              // 如 'gpt-4o-mini'、'claude-3-5-sonnet'
  temperature?: number;
  timeoutMs?: number;          // 覆盖配置默认超时
}

// 非流式文本生成
export interface AIInvokeParams extends AIBaseOptions {
  messages: AIMessage[];
  max_tokens?: number;
}
export interface AIInvokeResult {
  text: string;                // 聚合的最终文本
  raw?: any;                   // 供应商原始响应（可选）
}

// 流式文本生成
export interface AIStreamParams extends AIBaseOptions {
  messages: AIMessage[];
}
export interface AIChunk {
  delta: string;               // 增量 token 文本
  raw?: any;
}

// 向量嵌入
export interface AIEmbeddingParams extends AIBaseOptions {
  input: string | string[];
}
export interface AIEmbeddingResult {
  vectors: number[][];         // 与 input 一一对应
}

// 图像生成
export interface AIImageParams extends AIBaseOptions {
  prompt: string;
  size?: '256x256' | '512x512' | '1024x1024' | string;
  format?: 'dataURL' | 'filePath';
}
export interface AIImageResult {
  dataURL?: string;
  filePath?: string;
}

// 语音转文字（可选）
export interface AISpeechParams extends AIBaseOptions {
  filePath: string;            // 本地音频文件路径
}
export interface AISpeechResult {
  text: string;
}

// 标准错误
export interface AIError {
  code: 'ERR_PROVIDER_NOT_FOUND' | 'ERR_UNAUTHORIZED' | 'ERR_RATE_LIMIT' | 'ERR_NETWORK' | 'ERR_TIMEOUT' | 'ERR_UNKNOWN';
  message: string;
  detail?: any;
}
```

## API 一览

### 1) 非流式文本生成：invoke

```ts
const res = await window.rubick.ai.invoke<AIInvokeResult>({
  provider: 'openai',
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: '你是Rubick插件助手' },
    { role: 'user', content: '把这段文本摘要成3条要点：...' },
  ],
  temperature: 0.7,
  max_tokens: 1024,
});
console.log(res.text);
```

行为：
- 通过主进程 handler 建议路由到 `aiInvoke`（见路由挂接 [API.init()](src/main/common/api.ts:35)）
- 返回完整文本结果与可选原始响应

错误：
- 可能抛出 `AIError`，建议在插件侧用 try/catch 处理

### 2) 流式文本生成：stream（推荐用于对话/打字机效果）

默认返回 AsyncIterator：
```ts
const stream = await window.rubick.ai.stream<AIStreamParams>({
  provider: 'openai',
  model: 'gpt-4o-mini',
  messages,
});
let acc = '';
for await (const chunk of stream) {
  acc += chunk.delta;
  // 渲染 chunk.delta 到 UI
}
```

行为：
- 建议主进程 handler 路由到 `aiStream`，并通过 IPC 增量推送（可借鉴 [sendPluginSomeKeyDownEvent()](src/main/common/api.ts:288) 的事件派发模式）
- 需做好背压/节流，避免 UI 卡顿

错误：
- 迭代器可能抛出 `AIError`，请在 for-await 外部与内部做好异常处理

### 3) 向量嵌入：embed

```ts
const out = await window.rubick.ai.embed<AIEmbeddingResult>({
  provider: 'openai',
  model: 'text-embedding-3-small',
  input: ['文本1', '文本2'],
});
// out.vectors: number[][]
```

### 4) 图像生成：image.generate

```ts
const img = await window.rubick.ai.image.generate<AIImageResult>({
  provider: 'openai',
  prompt: 'A cute cat in watercolor style',
  size: '512x512',
  format: 'filePath', // 或 'dataURL'
});
// img.filePath 或 img.dataURL
```

建议：大二进制数据优先采用文件路径，避免大 DataURL 堵塞 IPC（参考实践建议于 [ai-integration](docs/development/ai-integration.md)）

### 5) 语音转文字：speech.transcribe（可选）

```ts
const text = await window.rubick.ai.speech.transcribe<AISpeechResult>({
  provider: 'openai',
  model: 'whisper-1',
  filePath: '/path/to/audio.m4a',
});
```

## Provider 选择与配置覆盖
- 优先级：入参.provider > rubick-ai-config.defaultProvider
- rubick-ai-config 结构与设置见：[ai-settings](docs/guide/ai-settings.md)
- 读取与持久化使用现有配置机制： [initLocalConfig.getConfig()](src/main/common/initLocalConfig.ts:27)、[initLocalConfig.setConfig()](src/main/common/initLocalConfig.ts:33)

## 错误模型与重试
主进程建议统一映射错误码（在 handler 内实现）：
- `ERR_PROVIDER_NOT_FOUND` 未找到可用 Provider（未配置或名称错误）
- `ERR_UNAUTHORIZED` 鉴权失败（密钥错误/权限不足）
- `ERR_RATE_LIMIT` 触发频控
- `ERR_NETWORK` 网络错误
- `ERR_TIMEOUT` 调用超时
- `ERR_UNKNOWN` 其他未分类错误

插件侧示例：
```ts
try {
  const res = await window.rubick.ai.invoke({ model: 'gpt-4o-mini', messages });
} catch (e: any) {
  // e 可能符合 AIError 结构
  console.error(e.code, e.message);
}
```

## 生命周期与性能建议
- 流式输出：主进程推送节流；渲染层合并小片段再渲染，平衡实时性与性能
- 取消/中断：建议在 `stream` 返回对象上暴露 `cancel()`（实现可选），用于用户取消生成
- 大响应：图像/音频返回文件路径，减少 IPC 压力

## 安全与权限
- 密钥只在主进程与本地数据库（PouchDB）保存，不回传渲染层
- 建议逐步开启更严格的窗口安全： `contextIsolation: true`、`nodeIntegration: false`，通过 preload 注入白名单 API（参考窗口配置位置 [BrowserWindow(webPreferences)](src/main/browsers/main.ts:35)）

## 插件最简示例：聊天面板（流式）

```ts
import { ref } from 'vue';

const messages = ref<AIMessage[]>([
  { role: 'system', content: '你是 Rubick 插件助手' },
]);

async function send(text: string) {
  messages.value.push({ role: 'user', content: text });
  const stream = await window.rubick.ai.stream({
    provider: 'openai',
    model: 'gpt-4o-mini',
    messages: messages.value,
  });
  let acc = '';
  try {
    for await (const chunk of stream) {
      acc += chunk.delta;
      // 渲染 acc
    }
  } catch (e) {
    // 处理 AIError
  }
  messages.value.push({ role: 'assistant', content: acc });
}
```

## 连接测试与设置联动
- 设置页提供 `连接测试`：主进程 handler 建议为 `ai:testConnection`（详见 [ai-settings](docs/guide/ai-settings.md)）
- 插件调用失败并提示 `ERR_PROVIDER_NOT_FOUND` 时，引导用户前往设置页配置 Provider

## 与现有模块对齐
- 主进程统一路由与事件派发： [API.init()](src/main/common/api.ts:35)、[sendPluginSomeKeyDownEvent()](src/main/common/api.ts:288)
- 语义化版本比较建议修复： [AdapterHandler.upgrade()](src/core/plugin-handler/index.ts:58)（与 AI 无直接关系，但为整体稳定性建议）
- 避免渲染层同步 IPC：参考 [search.vue 的 sendSync 用法](src/renderer/components/search.vue:163)，AI 接口一律异步

---

本参考文档定义了插件调用基座 AI 的标准接口、错误模型与最佳实践。若需扩展新的 AI 能力（如工具调用、RAG 检索等），请在基座侧新增对应 handler 并在此文档补充接口说明与示例。