# XSWL ZAP VNA VS Code Extension (MVP)

## Features

- Command: `XSWL: Get Service Status`
- Command: `XSWL: Validate Topology` (reads YAML from current editor)
- Command: `XSWL: Acquire Once` (inputs instanceId/sampleCount and shows frame summary)
- Command: `XSWL: Stream Preview` (cancellable stream preview with frame count summary)
- Command: `XSWL: Preview Waveform`（支持 `snapshot/live` 两种预览方式；live 会短时自动刷新）
  - 频域下支持 trace source 选择：`frame` / `receiverRaw` / `receiverCompensated` / `sParameterS11` / `all`
  - 选择 `receiverRaw` / `receiverCompensated` / `all` 时可输入 `channel index`（默认 0）
  - 选择 `all` 时可进一步勾选可见曲线（显隐控制）
  - 波形页图例可点击，支持运行中临时隐藏/显示曲线
  - 波形坐标轴显示基础刻度文本（x/y 的 min/max）
  - marker 以按曲线分组列表展示，并在图内绘制 min/max 标记点
  - marker 分组按 y 值优先级排序，当前主曲线（primary trace）高亮显示
  - 主曲线 marker 标签增加背景框，提升复杂图面读数可见性
  - 主曲线 marker 标签显示 `min/max + x/y` 完整数值（紧凑排版）
  - 新增 `Copy Primary Marker` 按钮，可一键复制主曲线 marker 数值
  - 复制操作在页面内显示成功/失败状态条
  - 复制触发后先显示 `Copying...` 状态，2 秒后自动淡出
  - 支持快捷键 `Ctrl+C` / `Cmd+C` 触发主曲线 marker 复制（无输入焦点时）
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
- Open a topology YAML file and run `XSWL: Validate Topology`
- Run command `XSWL: Acquire Once`
- Run command `XSWL: Stream Preview` and cancel from progress notification when needed
- Run command `XSWL: Preview Waveform` to visualize latest acquired points in a Webview chart
  - `snapshot`: 单次采集并显示
  - `live`: 基于 stream 的短时自动刷新（可设置 max frames，支持取消）
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
- 多 trace 模式（`all`）显示图例并叠加多曲线
