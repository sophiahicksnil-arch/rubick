# Rubick 基座 AI 能力集成与插件 API 开发文档

本文档描述 Rubick 基座如何集成主流大模型（LLM），并向插件暴露统一的 AI API 能力，以便插件开发者无需关注具体厂商差异即可调用。

## 目标
- 提供统一的 AI 网关（AI Gateway）抽象，兼容 OpenAI 接口协议及多厂商 SDK。
- 支持聊天补全、流式输出、嵌入向量、图像生成、语音转文本等能力。
- 向插件提供一致的调用接口与事件流。
- 统一配置管理、密钥存储与权限控制。

## 架构概览

```mermaid
flowchart LR
  P[插件 UI(BrowserView)] -->|window.rubick.ai| R[渲染进程]
  R -->|ipcRenderer.invoke('msg-trigger')| M[主进程 API]
  M --> G[AI Gateway ProviderAdapter]
  G --> O[OpenAI/兼容]
  G --> A[Anthropic]
  G --> Z[Azure OpenAI]
  G --> Gg[Google Gemini]
  G --> Q[阿里通义]
  G --> B[Baidu ERNIE]
  G --> L[本地Ollama]
```

Rubick 当前主进程事件路由在 [API.init()](src/main/common/api.ts:35) 中注册，通过 [ipcMain.on](src/main/common/api.ts:37) 统一处理。建议新增 AI 相关 handler（例如 `aiInvoke`、`aiStream`、`aiEmbeddings` 等）并挂接到现有路由。

## 能力矩阵
- 文本生成(Chat/Completion)：支持流式与非流式输出
- 嵌入向量(Embeddings)：用于语义检索/向量数据库
- 图像生成(Image Generation)：Stable Diffusion/OpenAI Images 等
- 语音(ASR/TTS)：可选（Whisper/厂商语音接口）

## 配置管理
- 本地配置键：`rubick-ai-config`（与现有配置管理 [localConfig](src/main/common/initLocalConfig.ts:7) 流程一致）
- 建议结构：

```json
{
  "providers": [
    { "type": "openai", "baseUrl": "https://api.openai.com/v1", "apiKey": "...", "model": "gpt-4o-mini" },
    { "type": "azureOpenAI", "endpoint": "https://xxx.openai.azure.com", "apiKey": "...", "deploymentId": "gpt-4o", "apiVersion": "2024-08-01-preview" },
    { "type": "anthropic", "apiKey": "...", "model": "claude-3-5-sonnet" },
    { "type": "gemini", "apiKey": "...", "model": "gemini-1.5-pro" },
    { "type": "dashscope", "apiKey": "...", "model": "qwen-plus" },
    { "type": "ernie", "apiKey": "...", "secretKey": "...", "model": "ernie-4.0-8k" },
    { "type": "ollama", "url": "http://localhost:11434", "model": "llama3" },
    { "type": "openaiCompatible", "baseUrl": "https://your-compat-endpoint/v1", "apiKey": "...", "model": "gpt-4o-mini" }
  ],
  "defaultProvider": "openai",
  "timeoutMs": 60000,
  "retry": { "retries": 2, "factor": 2 }
}
```

- 读取/写入方式参考 [localConfig.getConfig()](src/main/common/initLocalConfig.ts:27) 与 [localConfig.setConfig()](src/main/common/initLocalConfig.ts:33)。

## 插件 API 设计
插件端通过 `window.rubick.ai` 访问 AI 能力（由 preload 注入/或当前安全策略下直接暴露）。为避免 UI 阻塞，使用异步协议。

### 1. 文本补全（非流式）

示例（插件 BrowserView 内）：

```js
const res = await window.rubick.ai.invoke({
  provider: 'openai',
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: '你是Rubick插件助手' },
    { role: 'user', content: '把这段文本摘要成3条要点：...' }
  ],
  temperature: 0.7,
  max_tokens: 1024
});
console.log(res.text); // 完整文本
```

- 主进程 handler 建议名：`aiInvoke`，通过现有路由在 [API.init()](src/main/common/api.ts:35) 注册。

### 2. 文本补全（流式）

```js
const stream = await window.rubick.ai.stream({
  provider: 'openai',
  model: 'gpt-4o-mini',
  messages,
  temperature: 0.7
});

for await (const chunk of stream) {
  // 实时增量 token
  render(chunk.delta);
}
```

- 流式建议返回 AsyncIterator 或事件通道（`onToken`）。
- 主进程通过 `ipcMain` 推送增量片段到渲染进程，借鉴现有键盘事件回传模式 [sendPluginSomeKeyDownEvent](src/main/common/api.ts:288)。

### 3. Embeddings

```js
const vec = await window.rubick.ai.embed({
  provider: 'openai',
  model: 'text-embedding-3-small',
  input: ['待向量化文本1', '待向量化文本2']
});
// vec: number[] 或 { vectors: number[][] }
```

### 4. 图像生成

```js
const img = await window.rubick.ai.image.generate({
  provider: 'openai',
  prompt: 'A cute cat in watercolor style',
  size: '512x512'
});
// 返回 dataURL / 文件路径
```

### 5. 语音转文字（可选）

```js
const text = await window.rubick.ai.speech.transcribe({
  provider: 'openai',
  model: 'whisper-1',
  filePath: '/path/to/audio.m4a'
});
```

## 主进程接口约定
- 注册建议：在 [API.init()](src/main/common/api.ts:35) 的统一路由下新增 `case` 分发，例如：
  - `aiInvoke`：返回完整文本
  - `aiStream`：建立流式会话并向渲染进程发送增量
  - `aiEmbeddings`、`aiImageGenerate`、`aiTranscribe`
- 统一错误处理、超时与重试，错误码映射：
  - `ERR_PROVIDER_NOT_FOUND`、`ERR_UNAUTHORIZED`、`ERR_RATE_LIMIT`、`ERR_NETWORK`、`ERR_TIMEOUT`

## OpenAI 兼容协议
- 支持 `chat.completions`、`responses`（新统一接口）与 `embeddings`。
- 若使用 Azure OpenAI：需支持 `api-version` 与 `deploymentId`。
- 兼容自定义 `baseUrl`（如私有部署/代理）。

## 权限与安全
- 密钥仅存储于本地数据库，避免暴露到渲染层；插件侧不直接读密钥。
- 建议逐步收紧 Electron 安全策略（见 [BrowserWindow.webPreferences](src/main/browsers/main.ts:35) 说明），使用 preload 白名单 API。

## 性能与稳定性建议
- 流式输出采用背压与节流，避免过快向渲染进程推送导致 UI 卡顿。
- 网络调用统一超时（`timeoutMs`）与重试（指数退避）。
- 大响应（图像/音频）走文件路径传递，避免大 DataURL 堵塞 IPC。

## 插件示例：聊天面板

```js
import { ref } from 'vue';

const messages = ref([
  { role: 'system', content: '你是Rubick插件助手' }
]);

async function send(content) {
  messages.value.push({ role: 'user', content });
  const stream = await window.rubick.ai.stream({
    provider: 'openai',
    model: 'gpt-4o-mini',
    messages: messages.value
  });
  let acc = '';
  for await (const chunk of stream) {
    acc += chunk.delta;
    // 在 UI 中逐字渲染
  }
  messages.value.push({ role: 'assistant', content: acc });
}
```

## 常见问题（FAQ）
- 如何切换供应商？在 `rubick-ai-config` 中设置 `defaultProvider`，或在每次调用传入 `provider`。
- 如何使用私有部署？将 `type` 设为 `openaiCompatible` 并填写 `baseUrl` 与 `apiKey`。
- 流式与非流式的选择？实时交互使用流式；需要完整结果或后处理时使用非流式。

## 与现有模块的协同
- 插件安装/更新逻辑的语义化版本比较建议使用 `semver` 修复（参考 [AdapterHandler.upgrade()](src/core/plugin-handler/index.ts:58)）。
- 插件界面输入事件路由与主进程回传机制可参考 [sendPluginSomeKeyDownEvent()](src/main/common/api.ts:288)。
- 渲染层避免同步 IPC（参考 [search.vue 的 sendSync 用法](src/renderer/components/search.vue:163)），AI 接口全异步。

---

该文档为开发者指南，后续如需落地实现，请在主进程 [API.init()](src/main/common/api.ts:35) 所在模块新增 AI 路由与 Provider 适配器，并在 preload 注入 `window.rubick.ai` 白名单 API，以保证安全与一致性。
