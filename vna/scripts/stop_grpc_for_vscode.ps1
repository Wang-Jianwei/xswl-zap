param()

$ErrorActionPreference = "Stop"

$processes = Get-Process -Name "easy_grpc_server" -ErrorAction SilentlyContinue
if (-not $processes) {
  Write-Host "[VSCODE-GRPC] no easy_grpc_server process found"
  exit 0
}

$processes | Stop-Process -Force
Write-Host "[VSCODE-GRPC] stopped easy_grpc_server process(es)"
exit 0
