param(
  [switch]$SkipBuild,
  [switch]$SkipDoctor
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir

$doctorScript = Join-Path $scriptDir "doctor_grpc_for_vscode.ps1"
if (-not $SkipDoctor -and (Test-Path $doctorScript)) {
  Write-Host "[VSCODE-GRPC] preflight doctor check"
  & $doctorScript
  if ($LASTEXITCODE -ne 0) {
    throw "doctor_grpc_for_vscode failed. use -SkipDoctor to bypass."
  }
}

$existing = Get-Process -Name "easy_grpc_server" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($null -ne $existing) {
  Write-Host "[VSCODE-GRPC] already running. pid=$($existing.Id)"
  Write-Host "[VSCODE-GRPC] stop command: taskkill /IM easy_grpc_server.exe /F"
  exit 0
}

$serverExe = Join-Path $projectRoot "build-grpc\easy_grpc_server.exe"

if (-not $SkipBuild) {
  Write-Host "[VSCODE-GRPC] build grpc adapter artifacts"
  & (Join-Path $projectRoot "scripts\build_grpc_adapter.ps1")
}

if (-not (Test-Path $serverExe)) {
  throw "Missing grpc server binary: $serverExe"
}

$env:PATH = "C:\msys64\mingw64\bin;" + $env:PATH

Write-Host "[VSCODE-GRPC] starting easy_grpc_server.exe at 127.0.0.1:50051"
$process = Start-Process -FilePath $serverExe -WorkingDirectory $projectRoot -PassThru

Start-Sleep -Milliseconds 500
if ($process.HasExited) {
  throw "easy_grpc_server.exe exited unexpectedly."
}

Write-Host "[VSCODE-GRPC] started. pid=$($process.Id)"
Write-Host "[VSCODE-GRPC] stop command: taskkill /IM easy_grpc_server.exe /F"
