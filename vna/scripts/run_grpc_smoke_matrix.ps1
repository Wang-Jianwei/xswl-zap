param(
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$configPath = Join-Path $projectRoot "config\service.yaml"

$serverExe = Join-Path $projectRoot "build-grpc\easy_grpc_server.exe"
$unarySmokeExe = Join-Path $projectRoot "build-grpc\easy_grpc_client_smoke.exe"
$streamSmokeExe = Join-Path $projectRoot "build-grpc\easy_grpc_stream_smoke.exe"

$cases = @(
  @{ Name = "no-throttle"; Every = 1; Ms = 0; Frames = 5 },
  @{ Name = "default-throttle"; Every = 4; Ms = 10; Frames = 5 },
  @{ Name = "aggressive-throttle"; Every = 1; Ms = 20; Frames = 3 }
)

function Set-ConfigValue([string]$content, [string]$key, [string]$value) {
  $pattern = "(?m)^\s*" + [regex]::Escape($key) + "\s*:\s*.*$"
  if ([regex]::IsMatch($content, $pattern)) {
    return [regex]::Replace($content, $pattern, "${key}: $value")
  }

  $trimmed = $content.TrimEnd("`r", "`n")
  return $trimmed + "`r`n" + "${key}: $value" + "`r`n"
}

if (-not (Test-Path $configPath)) {
  throw "Missing config file: $configPath"
}

if (-not $SkipBuild) {
  Write-Host "[MATRIX] build grpc artifacts"
  & (Join-Path $projectRoot "scripts\build_grpc_adapter.ps1")
}

if (-not (Test-Path $serverExe) -or -not (Test-Path $unarySmokeExe) -or -not (Test-Path $streamSmokeExe)) {
  throw "Missing grpc binaries in build-grpc. Run scripts/build_grpc_adapter.ps1 first."
}

$originalConfig = Get-Content -Path $configPath -Raw
$hasFailure = $false

try {
  foreach ($case in $cases) {
    Write-Host "[MATRIX] case=$($case.Name) every=$($case.Every) ms=$($case.Ms) frames=$($case.Frames)"

    $updatedConfig = $originalConfig
    $updatedConfig = Set-ConfigValue -content $updatedConfig -key "stream_throttle_every_n_frames" -value ([string]$case.Every)
    $updatedConfig = Set-ConfigValue -content $updatedConfig -key "stream_throttle_ms" -value ([string]$case.Ms)
    Set-Content -Path $configPath -Value $updatedConfig -Encoding UTF8

    $env:PATH = "C:\msys64\mingw64\bin;" + $env:PATH
    $serverProcess = Start-Process -FilePath $serverExe -WorkingDirectory $projectRoot -PassThru

    try {
      Start-Sleep -Seconds 1

      & $unarySmokeExe "127.0.0.1:50051"
      $unaryExit = $LASTEXITCODE

      & $streamSmokeExe "127.0.0.1:50051" ([string]$case.Frames)
      $streamExit = $LASTEXITCODE

      if ($unaryExit -ne 0 -or $streamExit -ne 0) {
        $hasFailure = $true
        Write-Host "[MATRIX][FAIL] case=$($case.Name) unary=$unaryExit stream=$streamExit"
      }
      else {
        Write-Host "[MATRIX][PASS] case=$($case.Name)"
      }
    }
    finally {
      if ($serverProcess -and -not $serverProcess.HasExited) {
        Stop-Process -Id $serverProcess.Id -Force
      }
      Start-Sleep -Milliseconds 300
    }
  }
}
finally {
  Set-Content -Path $configPath -Value $originalConfig -Encoding UTF8
}

if ($hasFailure) {
  Write-Host "[MATRIX] finished with failures"
  exit 1
}

Write-Host "[MATRIX] all cases passed"
exit 0
