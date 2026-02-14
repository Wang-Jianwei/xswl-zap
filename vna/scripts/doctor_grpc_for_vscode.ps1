param()

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir

$checks = New-Object System.Collections.Generic.List[object]

function Add-Check {
  param(
    [string]$Name,
    [string]$Status,
    [string]$Message,
    [string]$Fix = ""
  )

  $checks.Add([pscustomobject]@{
      Name = $Name
      Status = $Status
      Message = $Message
      Fix = $Fix
    }) | Out-Null
}

function Resolve-CommandPath {
  param([string]$Command)

  $cmd = Get-Command $Command -ErrorAction SilentlyContinue
  if ($null -eq $cmd) {
    return ""
  }

  return $cmd.Source
}

function Check-Command {
  param(
    [string]$Name,
    [string]$Command,
    [string]$Fix
  )

  $path = Resolve-CommandPath -Command $Command
  if ([string]::IsNullOrWhiteSpace($path)) {
    Add-Check -Name $Name -Status "FAIL" -Message "$Command not found in PATH" -Fix $Fix
  } else {
    Add-Check -Name $Name -Status "PASS" -Message "$Command => $path"
  }
}

function Check-PathExists {
  param(
    [string]$Name,
    [string]$Path,
    [string]$Fix
  )

  if (Test-Path $Path) {
    Add-Check -Name $Name -Status "PASS" -Message "$Path"
  } else {
    Add-Check -Name $Name -Status "FAIL" -Message "Missing: $Path" -Fix $Fix
  }
}

function Check-TsProtoPlugin {
  $localCmd = Join-Path $projectRoot "tools\vscode-extension\node_modules\.bin\protoc-gen-ts_proto.cmd"
  $localShim = Join-Path $projectRoot "tools\vscode-extension\node_modules\.bin\protoc-gen-ts_proto"
  $globalCmd = Join-Path $env:APPDATA "npm\protoc-gen-ts_proto.cmd"
  $globalShim = Join-Path $env:APPDATA "npm\protoc-gen-ts_proto"

  if (Test-Path $localCmd) {
    Add-Check -Name "ts-proto plugin" -Status "PASS" -Message "local: $localCmd"
    return
  }
  if (Test-Path $localShim) {
    Add-Check -Name "ts-proto plugin" -Status "PASS" -Message "local: $localShim"
    return
  }
  if (Test-Path $globalCmd) {
    Add-Check -Name "ts-proto plugin" -Status "PASS" -Message "global: $globalCmd"
    return
  }
  if (Test-Path $globalShim) {
    Add-Check -Name "ts-proto plugin" -Status "PASS" -Message "global: $globalShim"
    return
  }

  $fix = "Set-Location '$projectRoot\tools\vscode-extension'; npm install -D ts-proto --ignore-scripts"
  Add-Check -Name "ts-proto plugin" -Status "FAIL" -Message "protoc-gen-ts_proto not found (local/global)" -Fix $fix
}

function Check-PortState {
  $conn = Get-NetTCPConnection -LocalPort 50051 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($null -eq $conn) {
    Add-Check -Name "TCP 50051" -Status "WARN" -Message "Port 50051 is not listening"
    return
  }

  $owningProcessId = $conn.OwningProcess
  $proc = Get-Process -Id $owningProcessId -ErrorAction SilentlyContinue
  if ($null -ne $proc -and $proc.ProcessName -eq "easy_grpc_server") {
    Add-Check -Name "TCP 50051" -Status "PASS" -Message "easy_grpc_server is listening (pid=$owningProcessId)"
  } else {
    Add-Check -Name "TCP 50051" -Status "WARN" -Message "Port 50051 occupied by pid=$owningProcessId ($($proc.ProcessName))" -Fix "Stop conflicting process or change grpcAddress in extension settings"
  }
}

Write-Host "[VSCODE-GRPC-DOCTOR] project root: $projectRoot"

Check-Command -Name "cmake" -Command "cmake" -Fix "Install CMake or add it to PATH"
Check-Command -Name "node" -Command "node" -Fix "Install Node.js and add it to PATH"
Check-Command -Name "npm" -Command "npm" -Fix "Install npm (comes with Node.js)"

Check-PathExists -Name "MSYS2 protoc" -Path "C:\msys64\mingw64\bin\protoc.exe" -Fix "Run: C:\msys64\usr\bin\bash.exe -lc 'pacman -S --needed mingw-w64-x86_64-protobuf'"
Check-PathExists -Name "MSYS2 grpc_cpp_plugin" -Path "C:\msys64\mingw64\bin\grpc_cpp_plugin.exe" -Fix "Run: C:\msys64\usr\bin\bash.exe -lc 'pacman -S --needed mingw-w64-x86_64-grpc'"

Check-TsProtoPlugin
Check-PathExists -Name "proto file" -Path (Join-Path $projectRoot "proto\vna.proto") -Fix "Check repository integrity"
Check-PathExists -Name "grpc build preset" -Path (Join-Path $projectRoot "CMakePresets.json") -Fix "Open and run scripts from vna/scripts or vna root"

$serverExe = Join-Path $projectRoot "build-grpc\easy_grpc_server.exe"
if (Test-Path $serverExe) {
  Add-Check -Name "grpc server binary" -Status "PASS" -Message $serverExe
} else {
  Add-Check -Name "grpc server binary" -Status "WARN" -Message "Missing: $serverExe" -Fix "Run: .\scripts\build_grpc_adapter.ps1"
}

Check-PortState

Write-Host ""
Write-Host "[VSCODE-GRPC-DOCTOR] summary"
foreach ($item in $checks) {
  Write-Host "[$($item.Status)] $($item.Name): $($item.Message)"
  if ($item.Status -eq "FAIL" -and -not [string]::IsNullOrWhiteSpace($item.Fix)) {
    Write-Host "        fix: $($item.Fix)"
  }
  if ($item.Status -eq "WARN" -and -not [string]::IsNullOrWhiteSpace($item.Fix)) {
    Write-Host "        hint: $($item.Fix)"
  }
}

$failCount = ($checks | Where-Object { $_.Status -eq "FAIL" }).Count
$warnCount = ($checks | Where-Object { $_.Status -eq "WARN" }).Count

Write-Host ""
Write-Host "[VSCODE-GRPC-DOCTOR] FAIL=$failCount WARN=$warnCount"

if ($failCount -gt 0) {
  exit 1
}

exit 0
