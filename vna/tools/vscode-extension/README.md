# XSWL ZAP VNA VS Code Extension (MVP)

## Features

- Command: `XSWL: Get Service Status`
- Command: `XSWL: Validate Topology` (reads YAML from current editor)
- Command: `XSWL: Open Control Center`（统一入口 App：多级菜单切换工作区/拓扑/扫描/波形；支持弹框交互；拓扑页内嵌可视化编辑（虚拟端口拖拽绑定到板卡端口）+ YAML 高级模式；内置工作区保存/激活、扫描状态控制、snapshot/live 波形）
- Activity Bar 入口：新增 `XSWL VNA` 活动栏图标，点击直接打开 `Control Center` 侧边栏（非文件型页面）
- 侧边栏标题栏动作：提供与聊天面板一致的标题按钮风格（最大化、关闭）
- 侧边栏最大化：`Control Center` 视图标题栏可一键 `Open Control Center (Maximized)`，切换到主编辑区大面板
- 侧边栏关闭：`Control Center` 视图标题栏可一键关闭侧边栏
- Command: `XSWL: Edit Workspace Topology`（Webview 可视化编辑工作区拓扑：明确区分“虚拟 VNA 端口”和“板卡端口”，通过拖拽完成虚拟端口→板卡端口绑定；板卡类型支持 `board` / `virtual-vna`；支持 Auto Assign / Assign To Selected / Clear Assignments；支持保存/加载/激活，保留 YAML 高级模式）
- Command: `XSWL: Acquire Once` (inputs instanceId/sampleCount and shows frame summary)
- Command: `XSWL: Stream Preview` (cancellable stream preview with frame count summary)
- Command: `XSWL: Import Acquisition`（从 JSON 导入一次采集结果并输出帧摘要）
- Command: `XSWL: Compare Imported Acquisition`（基于导入 JSON 发起当前采集并做容差比对，输出 match/mismatch 与 `grpc_compare_token`）
- Command: `XSWL: Batch Compare Imported Acquisition`（递归扫描目录下 JSON 基准文件并批量比对，输出 matched/mismatched/failed 汇总；可选落盘结构化 JSON 报告）
- Command: `XSWL: Preview Waveform`（支持 `snapshot/live` 两种预览方式；live 默认持续自动刷新，直到取消或关闭页面）
  - 频域预览会基于 `sampleCount` 自动构造扫频参数（`start/stop/sweepPointCount`），默认返回多点频域波形（不再退化为单点）
  - 频域下支持 trace source 选择：`frame` / `receiverRaw` / `receiverCompensated` / `sParameterS11` / `all`
  - 选择 `receiverRaw` / `receiverCompensated` / `all` 时可输入 `channel index`（默认 0）
  - 选择 `all` 时可进一步勾选可见曲线（显隐控制）
  - 波形页图例可点击，支持运行中临时隐藏/显示曲线
  - 频域图新增平滑渲染（moving average）与噪声包络阴影（envelope）
  - 频域纵轴改为自适应范围（robust percentile + padding），波动更易观察
  - 多曲线渲染统一使用共享坐标范围，避免各曲线各自缩放导致对比失真
  - `live` 预览新增 `peak hold` 叠加曲线，持续跟踪最近窗口内峰值
  - `live` 预览新增最近 N 帧均值曲线（rolling average），用于观察整体趋势
  - `live` 预览新增多帧统计面板（`peak-to-peak` / `mean` / `std` / `cv` / `window`）
  - 统计面板支持 `normal/warning/critical` 阈值高亮，便于快速识别波动异常
  - `live` 预览支持手动切换扫描状态：`continuous` / `single` / `hold`（`single` 会发起一帧采集并在该帧完成后自动进入 `hold`；`hold` 会停止 stream 扫描）
  - 扫描状态栏实时显示当前扫描模式、流状态（running/stopped）与累计帧数，便于观察持续扫描
  - 波形坐标轴显示基础刻度文本（x/y 的 min/max）
  - marker 以按曲线分组列表展示，并在图内绘制 min/max 标记点
  - marker 分组按 y 值优先级排序，当前主曲线（primary trace）高亮显示
  - 主曲线 marker 标签增加背景框，提升复杂图面读数可见性
  - 主曲线 marker 标签显示 `min/max + x/y` 完整数值（紧凑排版）
  - 新增 `Copy Primary Marker` 按钮，可一键复制主曲线 marker 数值
  - 复制操作在页面内显示成功/失败状态条
  - 复制触发后先显示 `Copying...` 状态，2 秒后自动淡出
  - 支持快捷键 `Ctrl+C` / `Cmd+C` 触发主曲线 marker 复制（无输入焦点时）
  - 复制文本包含 `timestampNs`，并在按钮旁显示快捷键提示
  - 无可复制主曲线时按钮置灰并给出原因提示
  - 复制状态文案附带本地时间戳，按 `Esc` 可立即清除状态提示
  - 复制按钮 tooltip 显示字符数（便于预估粘贴体积）
  - 复制文本附带 `source/channel` 维度；支持防连点（500ms）
  - 复制成功时按钮短暂显示 `Copied!`，并恢复默认文案
  - 状态条使用 `aria-live`，增强可访问性反馈
  - 新增 `Clear Status` 按钮，支持手动清理复制状态
  - 快捷键扩展为 `Ctrl/Cmd + C` 与 `Alt + C`，并显示 `Esc` 清理提示
  - 成功提示包含复制字符数；无 Clipboard API 时给出明确提示
- Command: `XSWL: Open Output` (focuses `XSWL VNA` output channel)
- Command: `XSWL: Clear Output` (clears `XSWL VNA` output channel)
- Output logs include timestamp + level + `requestId` for cross-command correlation
- Service status display prefers structured `configPath/bootstrapMode` fields; legacy `message | config=...` is fallback-only
- Reads backend config from VS Code settings:
  - `xswlZapVna.grpcAddress` (default `127.0.0.1:50051`)
  - `xswlZapVna.grpcDeadlineMs` (default `2000`)
  - `xswlZapVna.autoOpenOutput` (default `true`, controls whether commands auto-focus output)

## Backend Prerequisites (for command debugging)

1. Build + start gRPC server (one command)

```powershell
cd vna
.\scripts\start_grpc_for_vscode.ps1
```

如已构建过，可跳过重建：

```powershell
.\scripts\start_grpc_for_vscode.ps1 -SkipBuild
```

停止后端：

```powershell
.\scripts\stop_grpc_for_vscode.ps1
```

重启后端：

```powershell
.\scripts\restart_grpc_for_vscode.ps1
```

如已构建过，可跳过重建：

```powershell
.\scripts\restart_grpc_for_vscode.ps1 -SkipBuild
```

1. Ensure extension settings point to running server

- `xswlZapVna.grpcAddress`: `127.0.0.1:50051`
- `xswlZapVna.grpcDeadlineMs`: `2000` or higher for unstable environments

## Local Development

1. Install dependencies

```powershell
cd vna/tools/vscode-extension
npm install
```

1. Build + test

```powershell
npm run test
```

1. Run extension in debug

- Open this folder in VS Code
- Press `F5`
- Run command `XSWL: Get Service Status`
- Click Activity Bar icon `XSWL VNA` to open `Control Center` sidebar directly
- Run command `XSWL: Open Control Center` to focus the sidebar entry
- Run command `XSWL: Open Control Center (Maximized)` to open the same UI as a maximized panel
- Open a topology YAML file and run `XSWL: Validate Topology`
- Run command `XSWL: Edit Workspace Topology` to edit workspace-scoped topology config via UI
- Run command `XSWL: Acquire Once`
- Run command `XSWL: Stream Preview` and cancel from progress notification when needed
- Run command `XSWL: Import Acquisition` to load a JSON acquisition baseline
- Run command `XSWL: Compare Imported Acquisition` to compare current acquisition against imported baseline
- Run command `XSWL: Batch Compare Imported Acquisition` to compare all JSON baselines under a directory in one run
- Run command `XSWL: Preview Waveform` to visualize latest acquired points in a Webview chart
  - `snapshot`: 单次采集并显示
  - `live`: 基于 stream 的持续自动刷新（无固定帧数上限，支持取消）
- Run command `XSWL: Open Output` to view command logs in one place
- Run command `XSWL: Clear Output` to reset logs quickly

## Convenience

- Shortcuts:
  - `Ctrl+Alt+O`: `XSWL: Open Output`
  - `Ctrl+Alt+L`: `XSWL: Clear Output`
- Editor context menu:
  - `XSWL: Open Output`
  - `XSWL: Clear Output`

## 波形预览性能保护（MVP）

- Webview 渲染点数上限：512（超出自动下采样）
- live 模式刷新节流：默认每 3 帧刷新一次图形
- 扩展侧更新合并：当 Webview 消息通道拥塞时，仅保留最新波形帧，避免更新队列堆积
- 刷新间隔自适应：按当前总渲染点数动态提高最小刷新间隔，降低多 trace 高频刷新抖动
- Webview 侧帧内合并：`waveform-update` 在 `requestAnimationFrame` 周期内合并，只渲染最新一帧
- 图面渲染采用 Canvas（替代 SVG），降低大点数与高频更新下的 DOM 开销
- 多 trace 模式（`all`）显示图例并叠加多曲线
