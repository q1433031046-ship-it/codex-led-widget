# 账号档案与记录隔离设计

## 背景

当前额度助手把额度快照、历史曲线、统计账本、设置偏好和窗口状态都写在 `app.getPath("userData")` 根目录。用户更换 ChatGPT/Codex 账号后，新的额度会继续写入旧账号的记录，造成历史、Token 统计和窗口设置归属不清。

App Server 的 `account/read` 在本机返回 `type`、`email` 和 `planType`，其中邮箱是当前可用的账号名称；实现允许保存这个可读名称，但仍不保存密码、Token、登录 URL 或原始认证数据。

## 目标

- 自动识别账号变化，并为每个账号建立独立本地档案。
- 账号名称可读、可显示；内部档案键不可逆且不包含原始邮箱。
- 额度快照、额度历史、额度统计、显示偏好和窗口状态按账号隔离。
- 升级旧版本时安全迁移现有全局文件，不删除原始文件。
- 设置页能够看到当前账号和已记录账号的最近状态，明确数据归属。
- 账号切换不触发登录、不上传本地记录，只在本机选择档案。

## 架构

### 账号身份与注册表

新增 `src/main/account-profile-service.js`，负责纯函数和文件操作：

- `deriveAccountProfile(account)`：从 `id/accountId/userId` 或 `email` 生成 `profileId = acct-<sha256前24位>`；名称优先使用 `name/displayName/username/email`，最多 120 个字符。
- `loadAccountRegistry` / `saveAccountRegistry`：管理根目录 `account-profiles.json`，结构为 schemaVersion、activeProfileId 和 profiles 元数据。
- `ensureAccountProfile`：创建 `<userData>/accounts/<profileId>/`，记录 `displayName`、账号类型、套餐、首次/最近使用时间和 `archived` 标记。
- `migrateLegacyFiles`：首次建立当前档案时，将旧根目录中的账号相关文件复制到档案目录；复制是幂等的，原文件保留作为备份。

根目录仍保存应用级数据：初始化状态、模型价格缓存和模型会话扫描账本。账号档案目录保存：

```text
display-preferences.json
last-quota-snapshot.json
usage-history.json
quota-stats-ledger.json
window-size.json
stats-window-state.json
```

模型会话日志通常无法从本机可靠归属到单一账号，因此模型 Token 扫描账本继续保持全局，并在 UI 中标记为“本机记录”；额度百分比和额度历史严格按账号隔离。

### 生命周期与切换

1. 启动时读取注册表的 `activeProfileId`。如果存在，先从该档案加载状态；如果不存在，继续读取旧根目录，保证升级兼容。
2. `account/read` 成功后把账号元数据随 `getQuota` 返回，主进程调用 `ensureAccountProfile`。
3. 第一次识别账号时迁移旧文件并把该档案设为 active；内存中的旧状态无需丢弃，因为迁移源就是当前状态。
4. 识别到不同 `profileId` 时，先把旧档案的内存状态写回，再加载新档案；将新额度写入新档案并刷新主窗口、统计窗口和设置窗口。
5. 所有路径函数通过当前档案目录解析，避免某个保存点绕过隔离。

### 设置页

在“关于与诊断”中增加账号档案卡片：

- 当前账号名称、套餐、账号类型和最近刷新时间。
- 已记录账号列表，显示名称、套餐和最后使用时间；当前账号高亮。
- 显示说明“账号切换由 Codex 登录状态自动触发；本页不执行登录”。

设置状态只公开已脱敏的档案元数据，不把内部 profileId 的完整哈希、认证字段或路径传到渲染层。

## 错误处理与隐私

- 账号字段缺失时使用 `未命名账号` 和固定的 `acct-unknown` 档案，避免把一次无身份刷新误并入已知账号。
- 注册表或档案文件损坏时回退到默认状态并保留损坏文件，不删除用户数据。
- 写入使用临时文件 + rename，单个档案写入失败不阻塞额度内存刷新。
- 账号显示名称按单行文本清理控制字符和长度；不记录登录令牌、密码、登录 URL、认证响应或完整账号 ID。

## 验收标准

- 账号服务单测覆盖：稳定 profileId、名称清理、注册表恢复、首次迁移幂等、损坏文件回退。
- 额度服务测试确认 `getQuota` 返回脱敏账号元数据，旧测试字段保持兼容。
- 主进程静态测试确认所有账号相关持久化路径都经过当前档案目录，初始化状态和模型价格仍为全局。
- 设置测试确认当前账号和历史账号可见、当前项高亮、无认证字段泄漏。
- 使用两个合成账号连续刷新，验证两套额度快照/历史/偏好互不覆盖；切回旧账号后可恢复旧记录。
- 版本升级时旧根目录文件仍存在，并且首次启动后档案目录产生等价副本。
