param(
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "[VSCODE-GRPC] restarting easy_grpc_server"
& (Join-Path $scriptDir "stop_grpc_for_vscode.ps1")

if ($SkipBuild) {
  & (Join-Path $scriptDir "start_grpc_for_vscode.ps1") -SkipBuild
} else {
  & (Join-Path $scriptDir "start_grpc_for_vscode.ps1")
}
