# 归档分卷 02（实体迁移）
### 8.41 已完成 Work Unit

WU-MAINLINE-059: 插件频域波形多 trace 选择与叠加预览

- Objective: 在 VS Code 插件端提升频域分析能力，支持按数据产品选择波形来源并进行同屏对比。
- Scope (in/out):
  - in: `Preview Waveform` 频域模式新增 trace source 选择（`frame` / `receiverRaw` / `receiverCompensated` / `sParameterS11` / `all`）；Webview 支持多曲线叠加与图例；测试补齐。
  - out: 通道级筛选、交互式多 marker、曲线开关持久化。
- Files to change:
  - `vna/tools/vscode-extension/src/extension.ts`
  - `vna/tools/vscode-extension/src/serviceClient.ts`
  - `vna/tools/vscode-extension/src/types.ts`
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（复用既有 Acquire/StreamAcquisition 返回字段，仅扩展插件端映射与渲染）。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚 trace source 选择与多曲线渲染逻辑，恢复 WU058 的单曲线预览。
- Risks: `all` 模式多曲线叠加会增加 Webview 绘制负担，已沿用下采样与刷新节流策略缓解。
- Acceptance criteria:
  - 频域预览可选择 trace source。
  - `all` 模式可同屏展示多曲线并显示图例。
  - 插件测试通过。

- Status: ✅ Completed (2026-02-13)

- Validation result:
  - `cd vna/tools/vscode-extension && npm run test` 通过

### 8.42 已完成 Work Unit

WU-MAINLINE-060: 插件频域接收机通道选择（channel index）

- Objective: 提升 VS Code 插件端多通道可观测性，在频域下支持按接收机通道索引查看曲线。
- Scope (in/out):
  - in: `Preview Waveform` 在 `receiverRaw` / `receiverCompensated` / `all` 场景新增 `channel index` 输入；渲染按指定通道提取数据；测试与文档更新。
  - out: 自动探测后端最大通道数、通道命名别名管理、跨会话记忆上次通道。
- Files to change:
  - `vna/tools/vscode-extension/src/extension.ts`
  - `vna/tools/vscode-extension/src/serviceClient.ts`
  - `vna/tools/vscode-extension/src/types.ts`
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（不改动 proto；仅扩展插件端参数与映射）。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚 channel index 输入与通道映射逻辑，恢复首通道固定策略。
- Risks: 用户输入超出实际通道范围时可能导致接收机 trace 为空（已通过输入校验与现有空数据兜底处理）。
- Acceptance criteria:
  - 频域 `receiverRaw` / `receiverCompensated` / `all` 支持输入 channel index。
  - 接收机曲线按指定 channel 展示。
  - 插件测试通过。

- Status: ✅ Completed (2026-02-13)

- Validation result:
  - `cd vna/tools/vscode-extension && npm run test` 通过

### 8.43 已完成 Work Unit

WU-MAINLINE-061: 插件 `all` 模式曲线显隐控制

- Objective: 提升 VS Code 插件端多曲线可读性，在 `all` 叠加模式下支持按曲线开关可见性。
- Scope (in/out):
  - in: `Preview Waveform` 在 `trace source=all` 时增加可见曲线勾选；渲染层按选中集合过滤 trace；测试与文档更新。
  - out: 图内交互式图例点击开关、每实例显隐配置持久化。
- Files to change:
  - `vna/tools/vscode-extension/src/extension.ts`
  - `vna/tools/vscode-extension/src/serviceClient.ts`
  - `vna/tools/vscode-extension/src/types.ts`
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（不改动 proto，仅插件侧交互和渲染过滤逻辑）。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚 `all` 模式显隐选择与 trace 过滤逻辑，恢复默认全量叠加。
- Risks: 可见集合配置不当可能误以为数据缺失（通过 meta/legend 显示当前可见列表）。
- Acceptance criteria:
  - `all` 模式可勾选要显示的曲线。
  - 预览图与图例仅展示选中曲线。
  - 插件测试通过。

- Status: ✅ Completed (2026-02-13)

- Validation result:
  - `cd vna/tools/vscode-extension && npm run test` 通过

### 8.44 已完成 Work Unit

WU-MAINLINE-062: 插件图例点击显隐（运行中交互）

- Objective: 提升波形预览交互效率，支持在已打开图形中直接切换曲线显隐。
- Scope (in/out):
  - in: Webview 图例改为可点击控件；点击后即时隐藏/显示对应 trace；补齐测试与文档。
  - out: 缩放/平移、图内 marker 拖拽、显隐状态跨刷新持久化。
- Files to change:
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/src/extension.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（纯插件前端交互增强）。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚可点击图例与脚本化显隐逻辑，恢复静态图例展示。
- Risks: 需启用 webview script；若脚本异常将回退为静态图形显示。
- Acceptance criteria:
  - 图例可点击切换对应曲线显隐。
  - 不需要重新运行命令即可完成多曲线对比。
  - 插件测试通过。

- Status: ✅ Completed (2026-02-13)

- Validation result:
  - `cd vna/tools/vscode-extension && npm run test` 通过

### 8.45 已完成 Work Unit

WU-MAINLINE-063: 插件波形坐标轴刻度文本（x/y min/max）

- Objective: 提升插件波形可读性，在图内直接显示基础坐标刻度信息。
- Scope (in/out):
  - in: 在 Webview 坐标轴增加 x/y 的 min/max 文本刻度；补测试与文档。
  - out: 自适应多刻度分级、单位换算切换、缩放后动态坐标重排。
- Files to change:
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（纯前端渲染增强）。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚轴刻度文本渲染，恢复仅轴线/网格展示。
- Risks: 极端数值范围下刻度文本可能较长（已采用定点/科学计数法格式化）。
- Acceptance criteria:
  - 坐标轴显示 x/y min/max 文本。
  - 与现有波形渲染、图例显隐兼容。
  - 插件测试通过。

- Status: ✅ Completed (2026-02-13)

- Validation result:
  - `cd vna/tools/vscode-extension && npm run test` 通过

### 8.46 已完成 Work Unit

WU-MAINLINE-064: 插件 marker 分组列表与图内标记点

- Objective: 提升多曲线读数效率，将 marker 从纯文本提升为结构化展示与图内可视化。
- Scope (in/out):
  - in: marker 面板按 trace 分组展示；图内绘制 min/max 标记点；图例显隐与 marker 行联动；补测试与文档。
  - out: 交互式 marker 拖拽、更多 marker 类型（delta/reference）与持久化。
- Files to change:
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（仅插件前端渲染增强）。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚 marker 分组/图内标记点逻辑，恢复文本 marker 展示。
- Risks: 多曲线场景下标记点文本可能局部重叠（当前为最小实现，后续可引入避让策略）。
- Acceptance criteria:
  - marker 面板按 trace 分组展示。
  - 图内可见 min/max 标记点。
  - 图例显隐后 marker 行同步状态变化。
  - 插件测试通过。

- Status: ✅ Completed (2026-02-13)

- Validation result:
  - `cd vna/tools/vscode-extension && npm run test` 通过

### 8.47 已完成 Work Unit

WU-MAINLINE-065: marker 分组排序与主曲线高亮

- Objective: 在多曲线波形预览中提升 marker 可读性与关注点定位速度。
- Scope (in/out):
  - in: marker 分组按 y 值优先级排序；主曲线在图例与 marker 面板高亮；补测试与文档。
  - out: 用户自定义排序规则、主曲线手动切换与持久化。
- Files to change:
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（仅插件前端呈现增强）。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚 marker 排序与高亮样式，恢复默认原始顺序显示。
- Risks: 排序逻辑在极端同值场景下可能不稳定（当前保持主曲线优先，其他按数值降序）。
- Acceptance criteria:
  - marker 分组按 y 值优先级排序。
  - 主曲线在图例与 marker 面板可见高亮。
  - 插件测试通过。

- Status: ✅ Completed (2026-02-13)

- Validation result:
  - `cd vna/tools/vscode-extension && npm run test` 通过

### 8.48 已完成 Work Unit

WU-MAINLINE-066: 主曲线 marker 标签背景框

- Objective: 提升复杂图面（网格/多曲线叠加）下主曲线 marker 标签可读性。
- Scope (in/out):
  - in: 主曲线 marker 文本增加背景框样式；补测试与文档。
  - out: 自定义标签配色、字号偏好设置、标签避让布局优化。
- Files to change:
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（仅插件前端样式与渲染增强）。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚主曲线标签背景框渲染与样式，恢复纯文本标签。
- Risks: 标签背景框尺寸估算基于字符宽度，极端字体下可能存在轻微偏差。
- Acceptance criteria:
  - 主曲线 marker 标签具有背景框。
  - 与现有图例显隐、marker 分组排序兼容。
  - 插件测试通过。

- Status: ✅ Completed (2026-02-13)

- Validation result:
  - `cd vna/tools/vscode-extension && npm run test` 通过

### 8.49 已完成 Work Unit

WU-MAINLINE-067: 主曲线 marker 完整数值标签（min/max + x/y）

- Objective: 在图内直接提供主曲线 marker 关键读数，减少上下文切换与人工换算。
- Scope (in/out):
  - in: 主曲线 marker 标签显示 `min/max + x/y` 完整数值；保持紧凑排版；补测试与文档。
  - out: 单位动态切换、数值复制交互、标签重叠自动避让。
- Files to change:
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（插件前端展示增强）。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚主曲线标签完整数值渲染，恢复简短标签。
- Risks: 在极端数值宽度场景下，标签长度仍可能造成局部遮挡（已限制宽度并紧凑排版）。
- Acceptance criteria:
  - 主曲线 marker 标签显示 `min/max + x/y`。
  - 与现有背景框、排序、高亮逻辑兼容。
  - 插件测试通过。

- Status: ✅ Completed (2026-02-13)

- Validation result:
  - `cd vna/tools/vscode-extension && npm run test` 通过

### 8.50 已完成 Work Unit

WU-MAINLINE-068: 一键复制主曲线 marker 读数

- Objective: 降低人工抄录成本，支持将主曲线关键 marker 数值快速导出到外部上下文。
- Scope (in/out):
  - in: 波形页新增 `Copy Primary Marker` 按钮；Webview 向扩展发送复制消息；扩展写入系统剪贴板；补测试与文档。
  - out: 复制格式自定义模板、批量复制多 trace marker。
- Files to change:
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/src/extension.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（插件前端交互与扩展侧剪贴板能力增强）。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚复制按钮与消息处理逻辑，恢复只读展示。
- Risks: Webview 与扩展通信失败时复制动作无效（已保留浏览器剪贴板后备路径）。
- Acceptance criteria:
  - 页面可点击复制主曲线 marker 文本。
  - 扩展端可将文本写入剪贴板。
  - 插件测试通过。

- Status: ✅ Completed (2026-02-13)

- Validation result:
  - `cd vna/tools/vscode-extension && npm run test` 通过

### 8.51 已完成 Work Unit

WU-MAINLINE-069: 复制主曲线 marker 的页面内状态反馈

- Objective: 提升复制操作可感知性，在 Webview 内即时反馈复制结果。
- Scope (in/out):
  - in: 增加复制状态条；扩展端回传复制成功/失败消息；页面响应展示；补测试与文档。
  - out: 历史状态队列、可关闭通知、复制统计埋点。
- Files to change:
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/src/extension.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（插件端交互增强）。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚状态条渲染与复制结果消息处理，保留原有复制功能。
- Risks: 主题 token 在部分版本下可能不可用导致状态颜色退化（不影响功能）。
- Acceptance criteria:
  - 复制动作后页面可见成功/失败状态。
  - 扩展端与 Webview 消息通道稳定。
  - 插件测试通过。

- Status: ✅ Completed (2026-02-13)

- Validation result:
  - `cd vna/tools/vscode-extension && npm run test` 通过

### 8.52 已完成 Work Unit

WU-MAINLINE-070: 复制过程 `Copying...` 过渡态

- Objective: 让复制动作具备即时过程反馈，避免用户误判点击未生效。
- Scope (in/out):
  - in: 点击复制后立即显示 `Copying...` 状态。
  - out: 进度条动画与多阶段状态细分。
- Files to change:
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚复制过程过渡态逻辑。
- Risks: 无关键风险。
- Acceptance criteria:
  - 点击复制立即显示 `Copying...`。
  - 插件测试通过。

- Status: ✅ Completed (2026-02-13)

### 8.53 已完成 Work Unit

WU-MAINLINE-071: 复制状态条自动淡出

- Objective: 降低状态提示长期驻留造成的页面噪声。
- Scope (in/out):
  - in: 复制状态（成功/失败）2 秒后自动清理。
  - out: 用户可配置的持续时长设置。
- Files to change:
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚自动淡出逻辑，保持常驻状态条。
- Risks: 无关键风险。
- Acceptance criteria:
  - 状态条在 2 秒后自动隐藏。
  - 插件测试通过。

- Status: ✅ Completed (2026-02-13)

### 8.54 已完成 Work Unit

WU-MAINLINE-072: 快捷键复制主曲线 marker

- Objective: 提高操作效率，支持键盘快速复制关键读数。
- Scope (in/out):
  - in: 支持 `Ctrl/Cmd + C` 触发主曲线 marker 复制（非输入焦点）。
  - out: 快捷键自定义映射。
- Files to change:
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚快捷键监听逻辑。
- Risks: 需避免与输入框默认复制冲突（当前已做输入焦点保护）。
- Acceptance criteria:
  - `Ctrl/Cmd + C` 可触发复制（非输入焦点）。
  - 插件测试通过。

- Status: ✅ Completed (2026-02-13)

- Validation result (WU070~072 合并提交):
  - `cd vna/tools/vscode-extension && npm run test` 通过

### 8.55 已完成 Work Unit

WU-MAINLINE-073: 复制按钮快捷键提示

- Objective: 降低学习成本，让用户在页面内可见快捷操作路径。
- Scope (in/out):
  - in: 在复制按钮旁显示 `Ctrl/Cmd + C` 提示。
  - out: 按键自定义。
- Files to change:
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚快捷键提示文本。
- Risks: 无关键风险。
- Acceptance criteria:
  - 页面可见快捷键提示。
  - 插件测试通过。

- Status: ✅ Completed (2026-02-13)

### 8.56 已完成 Work Unit

WU-MAINLINE-074: 无主曲线时复制按钮禁用原因提示

- Objective: 在不可复制场景给出明确反馈，减少误操作疑惑。
- Scope (in/out):
  - in: 无主曲线时按钮置灰并显示原因 tooltip。
  - out: 复杂错误码体系。
- Files to change:
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚按钮禁用提示文案。
- Risks: 无关键风险。
- Acceptance criteria:
  - 无主曲线时按钮不可用且有原因提示。
  - 插件测试通过。

- Status: ✅ Completed (2026-02-13)

### 8.57 已完成 Work Unit

WU-MAINLINE-075: 复制文本附带时间戳

- Objective: 提升复制数据可追溯性，便于日志和报告回查。
- Scope (in/out):
  - in: 复制文本前置 `timestampNs` 字段。
  - out: 时间格式本地化。
- Files to change:
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚时间戳拼接逻辑。
- Risks: 无关键风险。
- Acceptance criteria:
  - 复制文本包含 `timestampNs`。
  - 插件测试通过。

- Status: ✅ Completed (2026-02-13)

- Validation result (WU073~075 合并提交):
  - `cd vna/tools/vscode-extension && npm run test` 通过

### 8.58 已完成 Work Unit

WU-MAINLINE-076: 复制状态附带本地时间戳

- Objective: 增强状态消息可追踪性，便于区分连续多次复制结果。
- Scope (in/out):
  - in: 成功/失败状态文案追加本地时间戳。
  - out: 可配置时间格式。
- Files to change:
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚时间戳附加逻辑。
- Risks: 无关键风险。
- Acceptance criteria:
  - 状态文案包含本地时间信息。
  - 插件测试通过。

- Status: ✅ Completed (2026-02-13)

### 8.59 已完成 Work Unit

WU-MAINLINE-077: `Esc` 快速清除复制状态

- Objective: 提供快速收敛噪声提示的键盘交互能力。
- Scope (in/out):
  - in: 按 `Esc` 立即清除页面状态条。
  - out: 通用热键配置系统。
- Files to change:
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚 `Esc` 清理监听逻辑。
- Risks: 无关键风险。
- Acceptance criteria:
  - `Esc` 可即时清除状态条。
  - 插件测试通过。

- Status: ✅ Completed (2026-02-13)

### 8.60 已完成 Work Unit

WU-MAINLINE-078: 复制按钮字符数 tooltip

- Objective: 让用户复制前可预估文本长度。
- Scope (in/out):
  - in: tooltip 显示复制内容字符数。
  - out: 内容分级预警。
- Files to change:
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚字符数 tooltip 拼接逻辑。
- Risks: 无关键风险。
- Acceptance criteria:
  - tooltip 展示字符数。
  - 插件测试通过。

- Status: ✅ Completed (2026-02-13)

- Validation result (WU076~078 合并提交):
  - `cd vna/tools/vscode-extension && npm run test` 通过

### 8.61 已完成 Work Unit

WU-MAINLINE-079: 复制文本附带 source/channel

- Objective: 提升复制结果的上下文完整性。
- Scope (in/out):
  - in: 复制文本增加 `source` 与 `channel` 字段。
  - out: 完整会话上下文导出。
- Status: ✅ Completed (2026-02-13)

### 8.62 已完成 Work Unit

WU-MAINLINE-080: 复制防连点（500ms）

- Objective: 避免连续触发导致重复复制与状态抖动。
- Scope (in/out):
  - in: 增加 500ms 去抖保护。
  - out: 可配置节流参数。
- Status: ✅ Completed (2026-02-13)

### 8.63 已完成 Work Unit

WU-MAINLINE-081: 复制成功按钮短态 `Copied!`

- Objective: 提供更直观的按钮级反馈。
- Scope (in/out):
  - in: 复制成功后按钮短暂显示 `Copied!`。
  - out: 多状态动画体系。
- Status: ✅ Completed (2026-02-13)

### 8.64 已完成 Work Unit

WU-MAINLINE-082: 快捷键提示增强 tooltip

- Objective: 增强快捷键可发现性。
- Scope (in/out):
  - in: 快捷键提示追加说明 tooltip。
  - out: 自定义提示文案。
- Status: ✅ Completed (2026-02-13)

### 8.65 已完成 Work Unit

WU-MAINLINE-083: 状态反馈可访问性（aria-live）

- Objective: 提升状态消息对辅助技术的可感知性。
- Scope (in/out):
  - in: 状态条启用 `aria-live=polite`。
  - out: 更细粒度可访问性语义。
- Status: ✅ Completed (2026-02-13)

### 8.66 已完成 Work Unit

WU-MAINLINE-084: 批次收敛与回归保持

- Objective: 将多项简单交互增强以单批方式完成并统一验证。
- Scope (in/out):
  - in: 聚合 WU079~084 的代码/测试/文档变更并统一测试。
  - out: 跨批次依赖调整。
- Status: ✅ Completed (2026-02-13)

- Files to change (WU079~084):
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（插件前端交互增强）。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚本批提交，恢复 WU078 状态。
- Risks: 无关键风险（均为前端提示与交互细化）。
- Acceptance criteria:
  - 新增交互文案/防抖/短态/可访问性生效。
  - 插件测试通过。

- Validation result (WU079~084 合并提交):
  - `cd vna/tools/vscode-extension && npm run test` 通过

### 8.67 已完成 Work Unit

WU-MAINLINE-085: 新增 `Clear Status` 操作

- Objective: 提供主动清理状态提示的入口。
- Scope (in/out):
  - in: 复制区新增 `Clear Status` 按钮。
  - out: 历史状态管理。
- Status: ✅ Completed (2026-02-13)

### 8.68 已完成 Work Unit

WU-MAINLINE-086: 新增 `Alt + C` 复制快捷键

- Objective: 提升键盘操作覆盖率。
- Scope (in/out):
  - in: 支持 `Alt + C` 触发复制。
  - out: 快捷键可配置。
- Status: ✅ Completed (2026-02-13)

### 8.69 已完成 Work Unit

WU-MAINLINE-087: 成功提示附带字符数

- Objective: 提供复制体积感知。
- Scope (in/out):
  - in: 成功提示附带 chars 数值。
  - out: 分级阈值告警。
- Status: ✅ Completed (2026-02-13)

### 8.70 已完成 Work Unit

WU-MAINLINE-088: Clipboard 不可用显式提示

- Objective: 明确失败原因，减少误判。
- Scope (in/out):
  - in: Clipboard API 不可用时显示明确错误。
  - out: 自动降级复制策略。
- Status: ✅ Completed (2026-02-13)

### 8.71 已完成 Work Unit

WU-MAINLINE-089: 快捷键提示文案补齐

- Objective: 强化操作可发现性。
- Scope (in/out):
  - in: 显示 `Ctrl/Cmd + C | Alt + C | Esc` 提示。
  - out: 本地化多语言提示。
- Status: ✅ Completed (2026-02-13)

### 8.72 已完成 Work Unit

WU-MAINLINE-090: 批次收敛与统一验证

- Objective: 合并处理多个简单交互 WU，降低切换成本。
- Scope (in/out):
  - in: 聚合 WU085~090 代码/测试/文档并统一回归。
  - out: 跨模块重构。
- Status: ✅ Completed (2026-02-13)

- Files to change (WU085~090):
  - `vna/tools/vscode-extension/src/waveformPreview.ts`
  - `vna/tools/vscode-extension/test/waveformPreview.test.ts`
  - `vna/tools/vscode-extension/README.md`
  - `vna/framework-ui.md`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无（插件前端交互增强）。
- Test plan:
  - `cd vna/tools/vscode-extension && npm run test`
- Rollback plan: 回滚本批提交，恢复 WU084 状态。
- Risks: 无关键风险。
- Acceptance criteria:
  - 新增清理入口、Alt 快捷键、字符数反馈与不可用提示可用。
  - 插件测试通过。

- Validation result (WU085~090 合并提交):
  - `cd vna/tools/vscode-extension && npm run test` 通过

### 8.73 已完成 Work Unit

WU-MAINLINE-091: 后端回放比对诊断增强（core + service + gRPC）

- Objective: 将回放比对从“是否匹配”提升到“可诊断可定位”，支撑后端主线可验证能力。
- Scope (in/out):
  - in: `AcquisitionComparator` 输出 `max/rms` 误差统计；mismatch 输出 point/channel/value + delta 上下文；service/gRPC 透传 compare detail；补 core/service 测试。
  - out: 变更 compare RPC 契约字段（保持现有 `detail` 文本承载）。
- Files to change:
  - `vna/src/core/acquisition_comparator.cpp`
  - `vna/src/service/vna_control_service.cpp`
  - `vna/src/service/grpc/vna_control_grpc_service.cpp`
  - `vna/tests/core/acquisition_comparator_test.cpp`
  - `vna/tests/core/vna_control_service_test.cpp`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无 proto 变更（沿用 `CompareImportedAcquisitionResponse.detail` 文本扩展诊断信息）。
- Test plan:
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test`
  - `cd vna && .\build\easy_acquisition_comparator_test.exe`
  - `cd vna && .\build\easy_vna_control_service_test.exe`
- Rollback plan: 回滚 comparator 诊断扩展与 service/grpc detail 透传，恢复原有简化 compare detail。
- Risks: detail 文本更长可能影响上层日志长度；当前未改 proto 字段结构，兼容性风险低。
- Acceptance criteria:
  - compare 成功返回包含 `max/rms` 统计信息。
  - compare 不匹配返回可定位上下文与 delta。
  - core/service 定向测试通过。

- Status: ✅ Completed (2026-02-13)

- Validation result:
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test` 通过
  - `cd vna && .\build\easy_acquisition_comparator_test.exe` 通过
  - `cd vna && .\build\easy_vna_control_service_test.exe` 通过

### 8.74 已完成 Work Unit

WU-MAINLINE-092: compare 详情包含 tolerance

- Objective: 提升 compare 结果可解释性。
- Scope (in/out):
  - in: compare 详情输出 tolerance。
  - out: tolerance 动态策略。
- Status: ✅ Completed (2026-02-13)

### 8.75 已完成 Work Unit

WU-MAINLINE-093: compare 详情包含分组样本计数

- Objective: 提供 receiver/sparameter 维度可观测性。
- Scope (in/out):
  - in: detail 输出 receiver_raw/receiver_comp/sparameter sample 计数。
  - out: 更细分通道级统计。
- Status: ✅ Completed (2026-02-13)

### 8.76 已完成 Work Unit

WU-MAINLINE-094: compare 增加 non-finite 值检测

- Objective: 避免 NaN/Inf 被静默比较导致误判。
- Scope (in/out):
  - in: IQ 与 S 参数复数值 non-finite 检测并返回定位信息。
  - out: 自动修复非有限值。
- Status: ✅ Completed (2026-02-13)

### 8.77 已完成 Work Unit

WU-MAINLINE-095: mismatch 上下文精细化

- Objective: 缩短故障定位路径。
- Scope (in/out):
  - in: mismatch detail 输出 point/channel/value + delta。
  - out: 二进制诊断附件。
- Status: ✅ Completed (2026-02-13)

### 8.78 已完成 Work Unit

WU-MAINLINE-096: service compare detail 透传增强

- Objective: 保持 core 诊断信息在 service 层完整可见。
- Scope (in/out):
  - in: 成功/失败 detail 均透传增强文本。
  - out: 新增 proto 结构化字段。
- Status: ✅ Completed (2026-02-13)

### 8.79 已完成 Work Unit

WU-MAINLINE-097: core/service 回归测试扩展

- Objective: 为诊断增强建立可持续回归保障。
- Scope (in/out):
  - in: comparator 与 control service 测试覆盖 tolerance/计数/non-finite/delta。
  - out: e2e 大规模回放数据集。
- Status: ✅ Completed (2026-02-13)

- Files to change (WU092~097):
  - `vna/src/core/acquisition_comparator.cpp`
  - `vna/src/service/vna_control_service.cpp`
  - `vna/src/service/grpc/vna_control_grpc_service.cpp`
  - `vna/tests/core/acquisition_comparator_test.cpp`
  - `vna/tests/core/vna_control_service_test.cpp`
  - `vna/README.md`
  - `vna/development-plan.md`
- Contract impact: 无 proto 变更（复用 `detail` 文本承载增强诊断）。
- Test plan:
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test`
  - `cd vna && .\build\easy_acquisition_comparator_test.exe`
  - `cd vna && .\build\easy_vna_control_service_test.exe`
- Rollback plan: 回滚本批提交，恢复 WU091 诊断粒度。
- Risks: detail 文本长度增加；对契约兼容性影响低。
- Acceptance criteria:
  - compare 详情含 tolerance/分组计数。
  - non-finite 值可被检测并返回定位信息。
  - core/service 定向测试通过。

- Validation result (WU092~097 合并提交):
  - `cd vna && cmake --build --preset ninja-mingw --target vna_acquisition_comparator_test vna_vna_control_service_test` 通过
  - `cd vna && .\build\easy_acquisition_comparator_test.exe` 通过
  - `cd vna && .\build\easy_vna_control_service_test.exe` 通过

### 8.80 已完成 Work Unit

WU-MAINLINE-098: instanceId mismatch 详情增强

- Objective: 明确实例不匹配的 expected/actual。
- Scope (in/out):
  - in: instanceId mismatch 输出 expected/actual。
  - out: 多实例自动映射修复。
- Status: ✅ Completed (2026-02-13)

