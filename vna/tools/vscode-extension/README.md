# XSWL ZAP VNA VS Code Extension (MVP)

## Features

- Command: `XSWL: Get Service Status`
- Command: `XSWL: Validate Topology` (reads YAML from current editor)
- Command: `XSWL: Acquire Once` (inputs instanceId/sampleCount and shows frame summary)
- Command: `XSWL: Stream Preview` (cancellable stream preview with frame count summary)
- Command: `XSWL: Preview Waveform` (opens a Webview line chart for acquired frequency/time frame)
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
- Run command `XSWL: Open Output` to view command logs in one place
- Run command `XSWL: Clear Output` to reset logs quickly

## Convenience

- Shortcuts:
  - `Ctrl+Alt+O`: `XSWL: Open Output`
  - `Ctrl+Alt+L`: `XSWL: Clear Output`
- Editor context menu:
  - `XSWL: Open Output`
  - `XSWL: Clear Output`
