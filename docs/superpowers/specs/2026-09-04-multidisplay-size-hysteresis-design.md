# 多屏磁吸尺寸连续性与接缝迟滞设计

## 背景

当前悬浮窗的磁吸逻辑已经能够保存 `displayId`、使用显示器 `workArea` 并在显示器变化后重新锚定，但跨屏拖动仍有两类用户可见问题：

1. 不同缩放比例或工作区尺寸的屏幕之间，窗口沿用上一块屏幕的宽高，视觉比例发生断层；在接缝附近会出现窗口突然变大或变小的感觉。
2. 窗口中心刚越过接缝就会切换目标显示器，而 `move` 和 `moved` 两条事件路径又可能重复结算，导致磁吸边缘在两块屏幕之间来回跳。

本设计只处理窗口几何与磁吸状态，不改变额度计算、账号档案、设置项或 App Server 登录协议。

## 目标

- 跨不同 DPI 的显示器移动时，窗口保持连续、可预测的物理视觉大小；同一块显示器内的用户手动调整仍然有效。
- 显示器目标在接缝附近具有迟滞：只有窗口中心明确进入另一块屏幕的稳定区域后才切换，避免边界抖动。
- `move`、`moved`、程序化动画和显示器热插拔共用一个可取消的 settle 流程，单次用户动作只产生一次吸附结算。
- 展开、折叠、启动恢复、任务栏变化、负坐标和过大窗口继续统一使用目标显示器 `workArea`。
- 旧版本没有新增字段时可以正常恢复；损坏或过期的缩放记录会被忽略并自动修复。

## 非目标

- 不提供“每台显示器独立保存一套用户宽高”的持久化配置；本次优先保证跨屏连续性。
- 不改变窗口的内容排版、字体规则或设置页信息架构。
- 不依赖操作系统显示器名称，显示器身份继续由 Electron 的 `display.id` 作为会话内提示，失效时重新解析。

## 关键定义与假设

### 坐标与尺寸

Electron `screen` API 返回的 `bounds`、`workArea` 与 `BrowserWindow` bounds 使用同一套屏幕坐标（包含负坐标）。所有纯函数只接受数值矩形，不读取全局 `screen`，便于单元测试。

### 物理视觉大小

窗口在跨屏时按显示器 `scaleFactor` 做一次性宽高换算，目标是保持相同的物理像素占用：

```text
newSize = oldSize × oldScaleFactor / newScaleFactor
```

换算只发生在确认目标显示器从 A 切换到 B 的瞬间，不在每个 `move` 事件中反复执行。若任一缩放因子缺失或不在 `[0.5, 8]` 范围内，则保持原尺寸并记录诊断字段，避免异常值放大窗口。

### 接缝迟滞

目标显示器选择分为“保持”和“切换”两阶段：

- 若记忆的显示器仍包含窗口中心，或窗口与其 `bounds` 的交集达到最大，则继续保持记忆目标。
- 只有窗口中心越过记忆显示器边界至少 `DISPLAY_SWITCH_HYSTERESIS = 48` DIP，或记忆目标已经不存在，才允许重新按中心、交集面积、距离排序选择目标。
- 迟滞只作用于显示器选择，不改变单屏内 `chooseSnapEdge` 的角点迟滞。

这样可以让窗口在接缝两侧短距离来回拖动时保持同一目标显示器；跨过稳定带后仍能自然切换。

## 数据模型

扩展内存中的 `magnetState`：

```js
{
  edge: 'left' | 'right' | 'top' | 'bottom' | null,
  displayId: string | number | null,
  displayScaleFactor: number | null,
  expanded: boolean,
  expandedBounds: { x, y, width, height } | null,
  meterSide: 'left' | 'right'
}
```

`displayScaleFactor` 是最近一次确认目标显示器时的基准，不是用户配置。保存到 `window-size.json` 时使用可选字段，读取旧文件时默认为当前显示器的 `scaleFactor`。保存前统一经过有限数值校验，禁止 `NaN`、无穷大和小于 1 的宽高。

## 组件与职责

### `src/main/magnet-controller.js`

新增纯函数：

- `normalizeScaleFactor(value)`：返回有限且合理的缩放因子，否则返回 `null`。
- `scaleBoundsForDisplay(bounds, fromScaleFactor, toScaleFactor, anchor)`：按上式换算宽高，并以窗口中心或指定边缘为锚点；结果保持正整数。
- `resolveDisplayForBounds(displays, bounds, rememberedId, options)`：保留现有默认排序，增加可选 `hysteresis` 参数。记忆目标存在且中心仍在其迟滞区域时直接返回记忆目标；否则沿用中心→交集→距离的稳定排序。

现有 `constrainBoundsToWorkArea`、`snapExpandedBounds`、`collapsedBounds` 和 `activationRect` 保持纯函数与现有参数兼容。

### `src/main/main.js`

- `magnetDisplay()` 将 `DISPLAY_SWITCH_HYSTERESIS` 传给解析器，并在返回结果后同步 `magnetState.displayId` 与 `displayScaleFactor`。
- 统一 `scheduleMagnetMoveFinished()`：清除旧 timer、在 180ms 无新移动后只调用一次 `handleMagnetMoveFinished`。`move` 与 `moved` 都只调用该调度器；程序化动画通过现有标志位短路，不进入 settle。
- `handleMagnetMoveFinished()` 在检测到真实显示器切换时，先调用 `scaleBoundsForDisplay`，再按新显示器 `workArea` 执行吸附/约束；同一显示器内不重复缩放。
- `reanchorMagnetWindow()` 在显示器热插拔、DPI 或任务栏变化后只做一次“解析目标→更新 scale→换算一次（如需要）→workArea 约束→恢复展开/折叠”的事务，并通过程序化移动标志避免事件回流。
- 所有保存路径（启动恢复、dock、resize、display metrics）写入最新 `displayScaleFactor`，但不覆盖用户手工改变后的宽高。

## 状态流与不变量

1. **用户拖动**：`will-move` 标记展开且取消折叠；`move`/`moved` 只更新候选 bounds 并调度 settle。
2. **settle**：解析带迟滞的目标显示器；若目标变化则一次性缩放；选择边缘；无边缘则清除磁吸；有边缘则生成完整位于 `workArea` 的 `expandedBounds`。
3. **程序化动画**：设置 `magnetProgrammaticMove`，所有窗口移动事件只更新动画状态，不触发新的 settle。
4. **热插拔/DPI**：使用当前实际窗口 bounds 重新解析；失效 displayId 不参与选择；完成后立即持久化修复结果。
5. **折叠轮询**：始终使用 `magnetState.displayId` 对应的 `workArea`；若该显示器消失，先 reanchor，再计算激活区域。

必须保持的不变量：

- `expandedBounds` 的宽高为正整数，且不大于目标 `workArea`。
- 展开状态下 `expandedBounds` 完整包含于目标 `workArea`。
- `displayScaleFactor` 与 `displayId` 始终成对更新；旧记录缺字段时从当前显示器补齐。
- 同一用户拖动动作最多触发一次边缘选择与一次尺寸换算。

## 错误处理与兼容

- 显示器列表为空时回退 `screen.getPrimaryDisplay()`；若主显示器也不可用，保留当前 bounds，不抛出未处理异常。
- 旧 `window-size.json`、未知 `displayId`、非法缩放因子或非法矩形全部走现有恢复路径并在成功后覆盖为规范化状态。
- 缩放换算后若超出 `workArea`，先裁剪宽高，再按当前边缘重新吸附，确保任务栏和负坐标场景不越界。
- settle timer 在窗口销毁、磁吸关闭和新一轮拖动开始时清除，避免向已销毁窗口发送 IPC。

## 测试策略

### 纯函数测试

在 `scripts/test-magnetic-docking.js` 增加：

- 100% 与 150% 缩放之间换算宽高的正反向稳定性、中心锚点与边缘锚点。
- 记忆显示器在接缝 ±1、±24、±47 DIP 时保持不变，超过 ±48 DIP 后才切换。
- 记忆显示器被移除、窗口跨负坐标屏幕、任务栏缩短 workArea、换算后宽高超过 workArea 的约束。
- 旧调用不传 `options` 时保持原有 `resolveDisplayForBounds` 结果。

### 源码/集成测试

- 断言 `main.js` 只有一个 move settle 调度入口，`moved` 不再直接调用处理器。
- 断言保存和恢复包含可选 `displayScaleFactor`，并在 reanchor 中调用缩放与约束函数。
- 运行现有 `pnpm test`，覆盖初始化、账号档案、设置依赖和磁吸回归。

### 真实 Windows 验收

- 用已安装包冷启动，确认旧用户数据保留且窗口可见。
- 在两块不同缩放比例的显示器间往返拖动，记录宽高、displayId、scaleFactor 和最终 edge；接缝处停留 3 秒不得发生边缘跳变。
- 分别验证左/右/上/下吸附、折叠激活、任务栏变化、负坐标布局及重启恢复。

## 发布边界

本次完成后只生成新的本地版本、安装包和审计记录；除非用户另行明确要求，不执行 GitHub push、创建 Release 或覆盖远端标签。
