param(
  [switch]$SkipBuild,
  [switch]$FailOnUnknownStderr
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

$knownNoisePatterns = @(
  "All log messages before absl::InitializeLog\(\) is called",
  "Metric with name 'grpc\.resource_quota\..*registered more than once\. Ignoring later registration\."
)

function Set-ConfigValue([string]$content, [string]$key, [string]$value) {
  $pattern = "(?m)^\s*" + [regex]::Escape($key) + "\s*:\s*.*$"
  if ([regex]::IsMatch($content, $pattern)) {
    return [regex]::Replace($content, $pattern, "${key}: $value")
  }

  $trimmed = $content.TrimEnd("`r", "`n")
  return $trimmed + "`r`n" + "${key}: $value" + "`r`n"
}

function Invoke-SmokeCommand {
  param(
    [string]$Executable,
    [string[]]$Arguments
  )

  $stdoutPath = [System.IO.Path]::GetTempFileName()
  $stderrPath = [System.IO.Path]::GetTempFileName()

  try {
    $process = Start-Process -FilePath $Executable `
      -ArgumentList $Arguments `
      -NoNewWindow `
      -Wait `
      -PassThru `
      -RedirectStandardOutput $stdoutPath `
      -RedirectStandardError $stderrPath

    $stdoutLines = @()
    $stderrLines = @()
    if (Test-Path $stdoutPath) {
      $stdoutLines += Get-Content -Path $stdoutPath
    }
    if (Test-Path $stderrPath) {
      $stderrLines += Get-Content -Path $stderrPath
    }
  }
  finally {
    if (Test-Path $stdoutPath) {
      Remove-Item -Path $stdoutPath -Force
    }
    if (Test-Path $stderrPath) {
      Remove-Item -Path $stderrPath -Force
    }
  }

  $exitCode = $process.ExitCode
  $suppressedCount = 0
  $unknownStderrCount = 0

  foreach ($line in $stdoutLines) {
    $isKnownNoise = $false
    foreach ($pattern in $knownNoisePatterns) {
      if ($line -match $pattern) {
        $isKnownNoise = $true
        break
      }
    }

    if ($isKnownNoise) {
      $suppressedCount += 1
      continue
    }

    Write-Host $line
  }

  foreach ($line in $stderrLines) {
    $isKnownNoise = $false
    foreach ($pattern in $knownNoisePatterns) {
      if ($line -match $pattern) {
        $isKnownNoise = $true
        break
      }
    }

    if ($isKnownNoise) {
      $suppressedCount += 1
      continue
    }

    Write-Host $line
    if (-not [string]::IsNullOrWhiteSpace($line)) {
      $unknownStderrCount += 1
    }
  }

  if ($suppressedCount -gt 0) {
    Write-Host "[MATRIX][NOISE] suppressed known grpc warnings: $suppressedCount"
  }

  return [PSCustomObject]@{
    ExitCode = $exitCode
    SuppressedCount = $suppressedCount
    UnknownStderrCount = $unknownStderrCount
  }
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

if ($FailOnUnknownStderr) {
  Write-Host "[MATRIX] strict mode enabled: unknown stderr will fail cases"
}

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

      $unaryResult = Invoke-SmokeCommand -Executable $unarySmokeExe -Arguments @("127.0.0.1:50051")
      $streamResult = Invoke-SmokeCommand -Executable $streamSmokeExe -Arguments @("127.0.0.1:50051", ([string]$case.Frames))

      $unaryExit = $unaryResult.ExitCode
      $streamExit = $streamResult.ExitCode
      $unknownStderrCount = $unaryResult.UnknownStderrCount + $streamResult.UnknownStderrCount

      if ($unaryExit -ne 0 -or $streamExit -ne 0) {
        $hasFailure = $true
        Write-Host "[MATRIX][FAIL] case=$($case.Name) unary=$unaryExit stream=$streamExit"
      }
      elseif ($FailOnUnknownStderr -and $unknownStderrCount -gt 0) {
        $hasFailure = $true
        Write-Host "[MATRIX][FAIL] case=$($case.Name) unknown_stderr=$unknownStderrCount (strict mode)"
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
