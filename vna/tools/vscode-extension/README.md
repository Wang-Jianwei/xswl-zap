# XSWL ZAP VNA VS Code Extension (MVP)

## Features

- Command: `XSWL: Get Service Status`
- Reads backend config from VS Code settings:
  - `xswlZapVna.grpcAddress` (default `127.0.0.1:50051`)
  - `xswlZapVna.grpcDeadlineMs` (default `2000`)

## Local Development

1. Install dependencies

```powershell
cd vna/tools/vscode-extension
npm install
```

2. Build + test

```powershell
npm run test
```

3. Run extension in debug

- Open this folder in VS Code
- Press `F5`
- Run command `XSWL: Get Service Status`
