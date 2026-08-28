# Codex LED Widget

<p align="center">
  <img src="assets/1.png" width="420" alt="Codex LED Widget preview" />
</p>

<p align="center">
  一个可自由缩放、可高度定制的 Windows Codex 额度悬浮窗。
</p>

<p align="center">
  <a href="#下载与使用">下载与使用</a> ·
  <a href="#主要功能">主要功能</a> ·
  <a href="#隐私说明">隐私说明</a> ·
  <a href="#english">English</a>
</p>

## 主要功能

- 5 小时额度与 7 天总额度实时显示。
- 圆球、电池两种能量仪表；电池支持横向和竖向。
- 窗口、卡片、左右区域和仪表都可自由缩放；电池、圆球和卡片支持四边与四角拖动，并自动记住位置、尺寸与显示选项。
- 可选贴边磁吸：支持屏幕上下左右四边，鼠标移开后立即开始收起、移回唤醒；左右吸附时仪表可自动换到靠屏幕内侧，也可手动固定在左侧或右侧。两种方向会镜像保持相同分栏比例；横向电池磁吸时自动化为只显示剩余额度的精简横条。
- 剩余额度从 50% 开始平滑变色，35% 和 10% 为黄色、红色关键节点；可关闭变色，也可在“统一按 5 小时额度”与“各模块按自身额度”间切换。
- 丝滑液面、随机气泡、粒子与高光动画，速度会随额度变化。
- 5 小时与 7 天消耗图可分别开启，并显示理论匀速与实际消耗。
- 独立额度统计页：今天、本周、累计额度，按模型拆分的 Token，以及美元/人民币 API 等值估算。
- API 价格不写死：按实际出现的模型读取 OpenAI 官方模型页，并缓存输入、缓存输入、缓存写入与输出价格；无法定价的内部模型会明确标记。
- 统计页内有独立的“模型与价格设置”：可重新扫描 Codex 模型、刷新官方价格、手动覆盖单个模型的四项单价并恢复官方自动更新；未来 Codex 出现新模型时会自动进入列表，代码层也保留可注册的价格来源接口。
- GPT/GitHub 风格的格子消耗日历：单月模式使用放大的 7 列日期格；多月模式是一条可左右拖动、跨年份首尾连续并按需延伸的每日格子时间线，选中月份默认居中高亮、相邻月份自动降低亮度；年视图可在“12个月大格”和“全年每日小格”间切换；悬停可查看当前消耗，单位支持总额度%、Token、美元、人民币。
- 消耗图在关闭期间仍持续记录，重新开启或重启应用不会清空同一额度周期的历史。
- 统计页秒开最近一次完整结果；应用在后台每 60 秒统一刷新，避免打开页面时重复扫描。
- 右键菜单可开关悬浮窗各区域、切换数据、调整排列；连续修改开关时会自动回到当前子菜单。日历单位、范围和月/年样式集中放在统计子页面，不在托盘菜单重复出现；所有设置均保存在本机。
- “悬浮窗卡片”子菜单提供独立总开关：关闭时只隐藏已勾选卡片，不改变各卡片的勾选组合；重新开启时只恢复原来勾选的卡片。无卡片时圆球、横向电池和竖向电池会随窗口空间自适应到合理尺寸。

## 下载与使用

1. 打开仓库的 [Releases](https://github.com/q1433031046-ship-it/codex-led-widget/releases) 页面。
2. 下载 `Codex-LED-Widget-v1.0.0-Windows-x64.exe`。
3. 确认 Windows 版 Codex 已安装并登录，然后双击运行。
4. 右键悬浮窗或系统托盘图标即可打开完整设置菜单。

运行要求：Windows 10/11 x64、已安装并登录 Codex。

> 当前发布文件未进行商业代码签名。Windows 首次运行时可能显示“未知发布者”，确认文件来自本仓库后可选择“更多信息 → 仍要运行”。

## 额度与统计说明

- “今日”按本地时间每天 00:00 重新开始。
- “本周”按本地时间每周一 00:00 重新开始。
- 日历默认显示当前月份，可直接选择其他月份；年视图提供 12 个月汇总与全年每日明细两种样式。只有本工具开始记录后的额度百分比数据可用于历史格子。
- Token 总数来自账户/本机可读取的使用记录；模型明细来自本机 Codex 会话日志，因此会显示单独的统计起始时间。
- 金额按各模型当前官方输入、缓存输入、缓存写入和输出价格做 API 等值估算，不代表订阅账单或实际扣费；无法取得价格的模型不会混入金额。
- 美元兑人民币汇率由公开汇率接口提供；接口不可用时保留美元金额并显示人民币汇率待更新，不使用写死的备用汇率。

## 隐私说明

- 使用本机已有的 Codex 登录状态，不要求输入或保存认证 Token。
- 额度、Token 历史、窗口设置与统计快照保存在当前电脑。
- 不上传额度或 Token 使用数据。
- 应用只会向 OpenAI 官方模型文档读取公开价格，并向公开汇率接口读取 USD/CNY；这些请求不会携带你的用量数据。

## 本地开发

```powershell
corepack enable
pnpm install --frozen-lockfile
pnpm run dev
```

生成唯一的 Windows 发布文件：

```powershell
pnpm run release
```

输出位于 `dist/Codex-LED-Widget-v1.0.0-Windows-x64.exe`。

## GitHub 发布

正式版本由维护者在本地完成检查和构建，再将唯一的 Windows `.exe` 上传到 GitHub Releases。

```powershell
git tag v1.0.0
git push origin v1.0.0
```

## 项目结构

```text
assets/                  screenshots
src/main/                Electron main process and local quota service
src/renderer/            widget and statistics UI
scripts/                 visual and behavior checks
```

## 开源协议

[MIT](LICENSE)

---

## English

Codex LED Widget is a customizable Windows desktop widget for Codex quota monitoring. It includes resizable orb and battery meters, 5-hour and 7-day usage charts, local quota history, token and estimated API cost statistics, and a GitHub-style contribution calendar.

The statistics page opens from the last complete local snapshot and shares one fixed 60-second background refresh with the widget. Optional four-edge magnetic docking starts retracting immediately after pointer leave and restores the widget on hover. Window size, position, layout, and display preferences are remembered locally.

### Download

Download `Codex-LED-Widget-v1.0.0-Windows-x64.exe` from [GitHub Releases](https://github.com/q1433031046-ship-it/codex-led-widget/releases). Windows 10/11 x64 and an installed, signed-in Codex app are required.

### Privacy

The app uses your existing local Codex session and does not ask for or store an authentication token. Quota history and preferences stay on your computer. An external request is made only to obtain the public USD/CNY exchange rate; no usage data is included.

### Build

```powershell
corepack enable
pnpm install --frozen-lockfile
pnpm run release
```

Licensed under the [MIT License](LICENSE).
