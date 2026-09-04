# Changelog

## 1.2.3 - 2026-09-04

- 修复不同 DPI 显示器之间拖动悬浮窗时视觉尺寸割裂的问题：跨屏只按新旧 `scaleFactor` 换算一次，并继续遵守目标工作区边界。
- 增加接缝显示器迟滞，窗口中心必须越过稳定带后才切换目标显示器，避免边缘在多屏接缝处来回跳动。
- 合并 `move`/`moved` 的磁吸结算调度，程序化动画和热插拔重锚不会重复触发用户拖动逻辑。

## 1.2.2 - 2026-09-02

- Normalized widget, statistics, and settings typography across window sizes.
- Added responsive type caps and line-height rules so large quota/token values stay visually balanced with their labels.

## 1.2.1 - 2026-09-02

- 设置页新增今日 5 小时、今日总消耗、本周 5 小时和累计总消耗四个独立开关；关闭整张统计卡时仍会保留各项选择。
- 统一 Token 数字格式，增加 T/P/E 大数单位，并为悬浮窗数值增加最大宽度和自适应字号，避免大数撑破卡片。

## 1.2.0 - 2026-09-02

- 新增账号档案记录：按 Codex 账号名称分别保存额度快照、消耗历史、统计、窗口位置和显示偏好。
- 首次成功读取账号时自动把旧版根目录数据迁移到该账号档案，原文件保留不删除；更换登录账号后自动切换档案。
- 设置页新增当前账号与历史账号列表，仅展示本地记录，不提供伪造的手动账号切换。
- 账号档案只保存用户可见的账号名称和套餐类型，不保存密码、认证令牌或原始账号 ID；本机模型会话用量仍按全局日志统计。

## 1.1.2 - 2026-09-02

- 修复首次初始化期间登录完成通知过早到达导致流程失败的问题，并增加会话通知回放与可重试状态。
- 修复多显示器、负坐标、任务栏和 DPI 变化下磁吸窗口越界/被裁切的问题；展开窗口统一约束到目标显示器工作区。
- 重排设置页行为分组，明确仪表、卡片、统计、Token 和颜色选项的总开关依赖；保存的子选项不会被清空。
- 增加初始化、通知回放、旧屏幕 ID 和工作区约束回归测试。

## 1.1.1 - 2026-08-30

- Completed the Codex App Server handshake by sending the required `initialized` notification before account and rate-limit requests.
- Increased the cold-start allowance and retries the initial account read once with a fresh App Server session when startup exceeds the first timeout.
- Added forced account refresh plus the official ChatGPT browser-login flow for first-run setup, without persisting credentials or account identifiers.
- Added a secure initialization window with progress, retry, reopen-login, settings, error, and success states.
- Added a versioned one-time layout recovery that disables broken legacy magnetic docking, removes unsafe edge coordinates, preserves all user content settings, and places the widget safely on screen.
- Marked restored quota snapshots stale until the first live refresh succeeds.
- Added protocol, initialization-state, controller, renderer, URL-validation, privacy-redaction, and responsive-layout regression coverage.

## 1.1.0 - 2026-08-30

- Fixed Pro quota detection by classifying every quota window from the server-provided duration instead of assuming the first bucket is 5 hours and the second is 7 days.
- Added selectable Codex quota sources and source-aware history storage so Codex, Spark, and future limit buckets do not share chart series.
- Hid unavailable 5-hour or 7-day cards and disabled their settings with an explanation instead of rendering missing data as zero.
- Replaced the nested native context menu and its delayed submenu-reopen workaround with a stable flat quick menu.
- Added a secure, single-instance settings window with immediate persistence, source switching with rollback, grouped advanced controls, and responsive layout.
- Preserved the last successful quota snapshot on refresh failure and marked it stale.
- Added sanitized diagnostic copying that excludes authentication values, account identifiers, and local paths.
- Added regression coverage for duration classification, source selection, history isolation, the flat quick menu, settings IPC, and diagnostic redaction.

## 1.0 - 2026-08-29

- Replaced the portable runtime with a per-user NSIS installer so normal launches run directly from the installation directory and no longer unpack full Electron copies into the Windows temporary directory.
- Added a startup check for the latest official GitHub release, with one notification per newer version and a direct download action.
- Preserved the existing `codex-led-widget` user-data directory across the packaging migration.

- Added freely resizable orb and horizontal/vertical battery meters.
- Added smooth quota-aware liquid, particle, bubble, highlight, and color transitions.
- Added a remembered switch between adaptive quota colors and a fixed cyan theme.
- Added unified 5-hour-driven colors or independent per-module quota colors.
- Added true diagonal resizing for meters and cards, with both dimensions persisted.
- Added independently configurable 5-hour and 7-day usage charts.
- Added local daily, weekly, lifetime quota and Token statistics.
- Added per-model token attribution and dynamically refreshed official model pricing for input, cached input, cache writes, and output.
- Added a dedicated model and price settings panel with Codex model rescanning, official-price refresh, persistent manual overrides, restore-to-official behavior, and an extensible pricing-provider interface.
- Added USD/CNY API-equivalent cost estimates without a hardcoded model price or exchange-rate fallback.
- Added a redesigned usage calendar with a large single-month grid, an infinitely extendable horizontally draggable multi-month timeline that stays seamless across years, current-month focus, 12 large yearly month summaries, an optional full-year daily grid, hover details, and four switchable units.
- Kept chart history recording and persisted while charts are hidden or the app is restarted.
- Added instant statistics-page startup from a persisted snapshot and one shared 60-second background refresh.
- Added persistent window position, size, layout, order, and display preferences.
- Added optional four-edge magnetic docking with corner hysteresis, multi-display work-area awareness, immediate pointer-leave retraction, hover expansion, automatic left/right meter placement, and a meter-only horizontal-battery mode.
- Prevented repeated launches or startup-shortcut activation from opening duplicate widget windows.
- Stopped repeated identical magnet-geometry reports from restarting the dock animation and causing one-pixel jitter on scaled displays.
- Mirrored the meter/card grid widths correctly on left docking and added persisted Auto, Meter Left, and Meter Right layout choices.
- Added a one-click master visibility switch that preserves individual card selections, plus adaptive meter sizing when the meter is displayed without cards.
- Reorganized the tray/context menus, removed calendar controls duplicated by the statistics subpage, and automatically reopened the active submenu while changing repeated toggle options.
- Prevented month navigation from needlessly rerendering the floating widget and raised the calendar drag threshold to avoid small click-time shifts.
