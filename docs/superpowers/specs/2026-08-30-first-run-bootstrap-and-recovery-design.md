# 首次初始化与故障恢复设计

**日期：** 2026-08-30  
**目标版本：** 1.1.1  
**状态：** 已获用户授权，采用推荐方案直接实施

## 背景与已确认故障

1. 当前用户配置保留了 `magneticEnabled: true`、`magnetEdge: "top"` 和 654×588 的展开尺寸。启动后窗口被折叠到屏幕顶边外，只剩 7 像素，鼠标和右键都很难重新激活。
2. 当前缓存能够正确识别 Pro（`prolite`）以及 Codex 的 10080 分钟窗口，但新的实时调用返回 `codex account authentication required to read rate limits`。`codex login status` 同时显示 `Not logged in`。
3. 额度服务只发送了 `initialize` 请求，没有发送官方协议要求的 `initialized` 通知，也没有在读取额度前调用 `account/read` 检查并刷新托管 ChatGPT 登录。
4. 启动时加载的旧快照继续保留 `stale: false`，在新的实时读取完成前会把缓存误呈现成最新数据。

官方 Codex App Server 文档要求每个连接先发送一次 `initialize`，随后发送 `initialized`；文档也提供 `account/read`、`account/login/start` 和 `account/login/completed` 完成认证检查与登录流程：<https://developers.openai.com/codex/app-server/>。

## 方案比较

### 方案 A：只重置窗口位置

优点是改动最小。缺点是无法修复 App Server 登录、握手和缓存新鲜度，窗口出现后仍然没有实时额度，因此不采用。

### 方案 B：后台循环重试额度

优点是没有新界面。缺点是未登录时会永远失败，用户不知道如何恢复，还会继续看到旧缓存，因此不采用。

### 方案 C：版本化初始化与可恢复登录（采用）

首次运行目标版本时安全恢复窗口；建立规范 App Server 会话；检查并刷新账户；未登录时启动托管 ChatGPT 浏览器登录；登录完成后读取额度、选择可用来源并持久化初始化状态。该方案同时解决可见性、认证和数据可信度。

## 初始化状态

新增 `initialization-state.json`，使用独立版本字段，避免把登录状态、窗口迁移和普通显示偏好混在一起。

```json
{
  "schemaVersion": 1,
  "layoutBootstrapVersion": 1,
  "accountBootstrapVersion": 1,
  "status": "ready",
  "lastAttemptAt": "2026-08-30T00:00:00.000Z",
  "lastSuccessAt": "2026-08-30T00:00:00.000Z",
  "lastError": null
}
```

允许的 `status` 为 `pending`、`checking`、`login_required`、`waiting_for_login`、`refreshing`、`ready` 和 `error`。文件不保存邮箱、账号 ID、Token、认证 URL 或设备码。

布局初始化和账户初始化分别记版本：布局安全恢复只执行一次；账户初始化未成功时在下次启动继续，而不是错误地标记完成。

## 启动流程

1. 加载普通偏好、窗口状态、初始化状态和缓存快照。
2. 若 `layoutBootstrapVersion < 1`：
   - 将 `magneticEnabled` 设为 `false`；
   - 清除保存窗口状态中的 `magnetEdge` 与 `displayId`；
   - 不复用旧坐标，创建窗口后放在主屏幕右下角；
   - 保留主题、卡片、图表、尺寸、历史和统计数据；
   - 写入 `layoutBootstrapVersion: 1`。
3. 无论初始化是否完成，加载缓存时都在内存中先设为 `stale: true`。只有本次进程的实时额度读取成功后才设为 `false`。
4. 创建主窗口和托盘，使用户始终有可见的恢复入口。
5. 若账户初始化未完成，自动打开单实例初始化窗口并开始检查；已完成时静默检查一次。
6. App Server 连接严格执行：`initialize` 请求成功 → `initialized` 通知 → `account/read { refreshToken: true }`。
7. 已存在 ChatGPT 账户时读取额度；未登录或认证失效时进入登录流程。
8. 登录成功后重新执行账户检查与额度读取。只有成功读到至少一个额度窗口才写入 `accountBootstrapVersion: 1` 和 `status: ready`。

## 登录流程

使用 App Server 托管的 ChatGPT 浏览器流程：

```json
{
  "method": "account/login/start",
  "params": {
    "type": "chatgpt",
    "useHostedLoginSuccessPage": true,
    "appBrand": "codex"
  }
}
```

应用只接收并用系统浏览器打开返回的 `authUrl`，不读取、代理或保存凭据。保持该 App Server 进程存活，等待匹配 `loginId` 的 `account/login/completed` 通知；成功后继续初始化，失败或五分钟超时后显示可重试错误。

浏览器只在首次初始化检测到确实需要登录时自动打开一次。同一次启动中的周期刷新不得重复打开浏览器。

## App Server 会话边界

新增独立的会话模块，负责：

- 启动/停止 `codex app-server --listen stdio://`；
- JSON-RPC 请求 ID、超时和响应匹配；
- 正确的 `initialize`/`initialized` 握手；
- 服务器通知订阅；
- 账户检查、浏览器登录等待与安全清理；
- 将 stderr 转换为长度受限、脱敏的用户错误。

普通额度刷新复用该模块创建短生命周期会话；首次登录使用一个持续到完成或超时的会话。额度标准化、历史和渲染逻辑保持独立。

## 初始化界面

新增安全的单实例初始化窗口，延续现有深色青蓝视觉系统，使用 `contextIsolation: true`、`nodeIntegration: false`。

界面显示：

- 当前步骤和简短说明；
- 已完成的“窗口恢复”“Codex 检查”“额度读取”步骤；
- 需要登录时的等待状态；
- “重新打开登录页”“重试”“打开完整设置”和“关闭”按钮；
- 成功后显示方案、额度来源和实际存在的窗口，然后自动关闭。

窗口不得显示邮箱、账号 ID、Token、完整 stderr 或认证 URL。关闭初始化窗口不会取消后台额度刷新；未完成时下次启动继续显示。

## 额度来源与仪表初始化

首次实时读取成功后：

- 优先选择 `codex`；不存在时选择第一个含有效窗口的来源；
- 当前来源没有 300 分钟窗口但有 10080 分钟窗口时，将 `meterSource` 初始化为 `secondary`；
- 不存在的 5 小时卡继续隐藏，不伪造为 0%；
- 已经成功完成账户初始化的用户以后切换来源或仪表，不再被自动覆盖。

## 错误恢复

- 认证失败：初始化窗口进入 `login_required` 或 `error`，保留旧缓存但明确标记过期。
- App Server 找不到：显示“未找到 Codex”，提供“打开 Codex”入口，不启动无限重试。
- 登录取消/超时：保留可重试状态，不写完成版本。
- 额度请求失败：不清空历史，不把旧快照标为实时，不自动反复打开浏览器。
- 窗口坐标损坏或显示器变化：现有可见性校验继续生效；首次迁移强制使用主屏幕安全位置。

## 安全与隐私

- 应用不接触或持久化认证 Token；认证由 Codex App Server 管理。
- IPC 采用固定命名方法，不暴露任意 shell、文件系统或通用 IPC。
- 认证 URL 仅传给主进程 `shell.openExternal`，不回传给普通悬浮窗。
- 初始化状态和诊断信息继续使用白名单字段和错误脱敏。

## 测试与验收

1. App Server 测试确认 `initialize` 响应后发送 `initialized`，随后才调用 `account/read` 与额度接口。
2. 已登录、未登录、刷新失败、登录成功、登录失败和超时均有可重复的模拟测试。
3. 首次布局迁移测试确认磁吸关闭、边缘清除、历史/外观保留，第二次启动不重复重置。
4. 缓存启动必须显示 `stale: true`；实时成功后变为 `false`。
5. Pro 只有 7 天窗口时，初始化选择 `secondary` 仪表且不显示 5 小时卡。
6. 初始化窗口 IPC、单实例行为、敏感字段脱敏和浏览器只打开一次均有契约测试。
7. 完整原有测试通过，完成 1280×720 与 640×480 视觉检查，构建 1.1.1 NSIS 安装包并覆盖安装验证。

## 非目标

- 不实现自定义 Token 存储。
- 不要求用户输入 API Key。
- 不清空额度历史、Token 统计或价格缓存。
- 不在每次启动时重置磁吸或窗口位置。
- 不改变服务端额度百分比和窗口时长的语义。
