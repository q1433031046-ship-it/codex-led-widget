# 统计指标开关 Implementation Plan

**Goal:** 让“今日 5 小时、今日总消耗、本周 5 小时、累计总消耗”四个统计指标可以在设置页独立开关，并让超大 Token 数字在悬浮窗中保持可读且不撑破卡片。

**Architecture:** 复用现有 `quotaStatVisibility` 持久化字段和 `settings:preferences:set` IPC，只补齐嵌套字段的安全白名单；设置页用 `data-stat-visibility` 控件更新单个指标，两个渲染器继续读取同一份偏好。

**Verification:** 增加设置静态检查、嵌套字段白名单断言和大数格式化/CSS 约束检查，运行完整 `pnpm test`，重新构建并覆盖安装后冷启动确认偏好文件仍可读取。

## Implementation steps

- [x] 在设置页“统计与费用”区域增加四个独立复选框，并在渲染器中读取、保存和回滚 `quotaStatVisibility`。
- [x] 在主进程设置输入白名单中安全接收四个布尔值，保留总开关与旧配置兼容。
- [x] 扩展回归测试，确认四个控件存在、嵌套字段不会注入额外键且设置同步逻辑存在；统一 K/M/B/T/P/E 大数格式并限制 Token 值的显示宽度与字号。
- [x] 运行完整测试、构建、覆盖安装和冷启动验收。
