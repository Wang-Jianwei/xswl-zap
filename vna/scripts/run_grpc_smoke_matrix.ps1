param(
  [switch]$SkipBuild,
  [switch]$FailOnUnknownStderr,
  [int]$SmokeTimeoutSec = 20,
  [string]$ReportJsonPath = ""
)

$ErrorActionPreference = "Stop"

function Ensure-MingwRuntime {
  $mingwBin = "C:\msys64\mingw64\bin"
  if (-not (Test-Path $mingwBin)) {
    throw "Missing MinGW runtime path: $mingwBin"
  }

  if ($env:PATH -notlike "$mingwBin*") {
    $env:PATH = "$mingwBin;" + $env:PATH
  }

  $cc1plus = Join-Path $mingwBin "..\lib\gcc\x86_64-w64-mingw32\15.2.0\cc1plus.exe"
  if (-not (Test-Path $cc1plus)) {
    throw "Missing gcc frontend: $cc1plus"
  }
}

if ($null -ne (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue)) {
  $PSNativeCommandUseErrorActionPreference = $false
}

Ensure-MingwRuntime

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$configPath = Join-Path $projectRoot "config\service.yaml"

$serverExe = Join-Path $projectRoot "build-grpc\easy_grpc_server.exe"
$unarySmokeExe = Join-Path $projectRoot "build-grpc\easy_grpc_client_smoke.exe"
$streamSmokeExe = Join-Path $projectRoot "build-grpc\easy_grpc_stream_smoke.exe"
$smokeEndpoint = "127.0.0.1:50051"
$scriptName = "run_grpc_smoke_matrix.ps1"

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

function Resolve-ReportPath {
  param(
    [string]$PathTemplate
  )

  if ([string]::IsNullOrWhiteSpace($PathTemplate)) {
    return ""
  }

  $utcNow = (Get-Date).ToUniversalTime()
  $localNow = Get-Date
  $resolved = $PathTemplate
  $resolved = $resolved.Replace("{timestamp}", $utcNow.ToString("yyyyMMdd-HHmmss"))
  $resolved = $resolved.Replace("{timestampUtc}", $utcNow.ToString("yyyyMMdd-HHmmss"))
  $resolved = $resolved.Replace("{timestampLocal}", $localNow.ToString("yyyyMMdd-HHmmss"))

  return $resolved
}

function Get-StringSha256 {
  param(
    [string]$Text
  )

  $sha256 = [System.Security.Cryptography.SHA256]::Create()
  try {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
    $hashBytes = $sha256.ComputeHash($bytes)
    return ([System.BitConverter]::ToString($hashBytes) -replace "-", "").ToLowerInvariant()
  }
  finally {
    $sha256.Dispose()
  }
}

function Invoke-SmokeCommand {
  param(
    [string]$Executable,
    [string[]]$Arguments,
    [int]$TimeoutSec,
    [string]$ExpectedSuccessPattern
  )

  $stdoutPath = [System.IO.Path]::GetTempFileName()
  $stderrPath = [System.IO.Path]::GetTempFileName()

  try {
    $argumentText = if ($Arguments -and $Arguments.Count -gt 0) { ($Arguments -join " ") } else { "" }
    $cmdLine = if ([string]::IsNullOrWhiteSpace($argumentText)) { "`"$Executable`"" } else { "`"$Executable`" $argumentText" }

    $process = Start-Process -FilePath "cmd.exe" `
      -ArgumentList @("/c", $cmdLine) `
      -NoNewWindow `
      -PassThru `
      -RedirectStandardOutput $stdoutPath `
      -RedirectStandardError $stderrPath

    $completed = $process.WaitForExit($TimeoutSec * 1000)
    $timedOut = -not $completed
    if ($timedOut -and -not $process.HasExited) {
      [void](Stop-Process -Id $process.Id -Force)
    }
    if (-not $timedOut) {
      [void]($process.WaitForExit())
    }

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

  $exitCode = if ($timedOut) { 124 } else { $process.ExitCode }
  $suppressedCount = 0
  $unknownStderrCount = 0
  $successMatched = $false
  $compareMismatchWarningCount = 0
  $grpcCompareTokens = @()

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

    if (-not [string]::IsNullOrWhiteSpace($ExpectedSuccessPattern) -and $line -match $ExpectedSuccessPattern) {
      $successMatched = $true
    }

    if ($line -match "CompareImportedAcquisition warning:\s*matched=false") {
      $compareMismatchWarningCount += 1
    }

    if ($line -match "grpc_compare_token=[^,\s]+") {
      $grpcCompareTokens += $matches[0]
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

    if (-not [string]::IsNullOrWhiteSpace($ExpectedSuccessPattern) -and $line -match $ExpectedSuccessPattern) {
      $successMatched = $true
    }

    Write-Host $line
    if (-not [string]::IsNullOrWhiteSpace($line)) {
      $unknownStderrCount += 1
    }

    if ($line -match "grpc_compare_token=[^,\s]+") {
      $grpcCompareTokens += $matches[0]
    }
  }

  if ($suppressedCount -gt 0) {
    Write-Host "[MATRIX][NOISE] suppressed known grpc warnings: $suppressedCount"
  }

  if ($timedOut) {
    Write-Host "[MATRIX][TIMEOUT] executable=$Executable timeout_sec=$TimeoutSec"
  }

  $effectiveExitCode = $exitCode
  if (-not $timedOut -and $null -eq $effectiveExitCode) {
    if ($successMatched) {
      $effectiveExitCode = 0
    }
    else {
      $effectiveExitCode = 125
    }
  }
  elseif (-not $timedOut -and -not [string]::IsNullOrWhiteSpace($ExpectedSuccessPattern) -and -not $successMatched -and $effectiveExitCode -eq 0) {
    $effectiveExitCode = 125
  }

  $uniqueGrpcCompareTokens = @($grpcCompareTokens | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique | Sort-Object)

  return ,([PSCustomObject]@{
    ExitCode = $effectiveExitCode
    SuppressedCount = $suppressedCount
    UnknownStderrCount = $unknownStderrCount
    CompareMismatchWarningCount = $compareMismatchWarningCount
    GrpcCompareTokenCount = $uniqueGrpcCompareTokens.Count
    GrpcCompareTokens = $uniqueGrpcCompareTokens
    TimedOut = $timedOut
    SuccessMatched = $successMatched
  })
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
$configHashSha256 = Get-StringSha256 -Text $originalConfig
$hasFailure = $false
$matrixResults = @()
$matrixStartedAt = Get-Date

if ($FailOnUnknownStderr) {
  Write-Host "[MATRIX] strict mode enabled: unknown stderr will fail cases"
}

if ($SmokeTimeoutSec -le 0) {
  throw "SmokeTimeoutSec must be > 0"
}

try {
  $caseIndex = 0
  foreach ($case in $cases) {
    $caseIndex += 1
    $caseStartedAt = Get-Date
    Write-Host "[MATRIX] case=$($case.Name) every=$($case.Every) ms=$($case.Ms) frames=$($case.Frames)"

    $updatedConfig = $originalConfig
    $updatedConfig = Set-ConfigValue -content $updatedConfig -key "stream_throttle_every_n_frames" -value ([string]$case.Every)
    $updatedConfig = Set-ConfigValue -content $updatedConfig -key "stream_throttle_ms" -value ([string]$case.Ms)
    Set-Content -Path $configPath -Value $updatedConfig -Encoding UTF8

    $serverProcess = Start-Process -FilePath $serverExe -WorkingDirectory $projectRoot -PassThru

    try {
      Start-Sleep -Seconds 1

      $unaryResult = Invoke-SmokeCommand `
        -Executable $unarySmokeExe `
        -Arguments @($smokeEndpoint) `
        -TimeoutSec $SmokeTimeoutSec `
        -ExpectedSuccessPattern "grpc smoke client success" | Select-Object -Last 1

      $streamResult = Invoke-SmokeCommand `
        -Executable $streamSmokeExe `
        -Arguments @($smokeEndpoint, ([string]$case.Frames)) `
        -TimeoutSec $SmokeTimeoutSec `
        -ExpectedSuccessPattern "grpc stream smoke success" | Select-Object -Last 1

      $unaryExit = $unaryResult.ExitCode
      $streamExit = $streamResult.ExitCode
      $unknownStderrCount = $unaryResult.UnknownStderrCount + $streamResult.UnknownStderrCount
      $casePassed = $false
      $failureReason = "none"

      if ($unaryExit -ne 0 -or $streamExit -ne 0) {
        $hasFailure = $true
        if ($unaryResult.TimedOut -or $streamResult.TimedOut) {
          $failureReason = "timeout"
        }
        else {
          $failureReason = "exit_code"
        }
        Write-Host "[MATRIX][FAIL] case=$($case.Name) unary=$unaryExit stream=$streamExit"
      }
      elseif ($FailOnUnknownStderr -and $unknownStderrCount -gt 0) {
        $hasFailure = $true
        $failureReason = "unknown_stderr"
        Write-Host "[MATRIX][FAIL] case=$($case.Name) unknown_stderr=$unknownStderrCount (strict mode)"
      }
      else {
        $casePassed = $true
        Write-Host "[MATRIX][PASS] case=$($case.Name)"
      }

      $caseResultDigest = "reason=$failureReason;unary=$unaryExit;stream=$streamExit;unknownStderr=$unknownStderrCount"

      $matrixResults += [PSCustomObject]@{
        caseIndex = $caseIndex
        name = $case.Name
        throttleEveryFrames = $case.Every
        throttleMs = $case.Ms
        streamFrames = $case.Frames
        durationMs = [int]((Get-Date) - $caseStartedAt).TotalMilliseconds
        unaryExitCode = $unaryExit
        streamExitCode = $streamExit
        unaryTimedOut = $unaryResult.TimedOut
        streamTimedOut = $streamResult.TimedOut
        suppressedNoiseCount = $unaryResult.SuppressedCount + $streamResult.SuppressedCount
        unknownStderrCount = $unknownStderrCount
        compareMismatchWarningCount = $unaryResult.CompareMismatchWarningCount + $streamResult.CompareMismatchWarningCount
        grpcCompareTokenCount = $unaryResult.GrpcCompareTokenCount + $streamResult.GrpcCompareTokenCount
        grpcCompareTokens = @($unaryResult.GrpcCompareTokens + $streamResult.GrpcCompareTokens | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique | Sort-Object)
        failureReason = $failureReason
        resultDigest = $caseResultDigest
        passed = $casePassed
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

if (-not [string]::IsNullOrWhiteSpace($ReportJsonPath)) {
  $resolvedReportPath = Resolve-ReportPath -PathTemplate $ReportJsonPath
  $failedCaseNames = @($matrixResults | Where-Object { -not $_.passed } | ForEach-Object { $_.name })
  $noiseSuppressedTotal = @($matrixResults | Measure-Object -Property suppressedNoiseCount -Sum).Sum
  if ($null -eq $noiseSuppressedTotal) {
    $noiseSuppressedTotal = 0
  }
  $unknownStderrTotal = @($matrixResults | Measure-Object -Property unknownStderrCount -Sum).Sum
  if ($null -eq $unknownStderrTotal) {
    $unknownStderrTotal = 0
  }
  $compareMismatchWarningTotal = @($matrixResults | Measure-Object -Property compareMismatchWarningCount -Sum).Sum
  if ($null -eq $compareMismatchWarningTotal) {
    $compareMismatchWarningTotal = 0
  }
  $compareTokenTotal = @($matrixResults | Measure-Object -Property grpcCompareTokenCount -Sum).Sum
  if ($null -eq $compareTokenTotal) {
    $compareTokenTotal = 0
  }

  $compareContextTokens = @()
  foreach ($caseResult in $matrixResults) {
    $compareContextTokens += @($caseResult.grpcCompareTokens)
  }
  $compareContextTokens = @($compareContextTokens | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique | Sort-Object)

  $failureSummary = [PSCustomObject]@{
    totalFailedCases = @($matrixResults | Where-Object { -not $_.passed }).Count
    exitCode = @($matrixResults | Where-Object { $_.failureReason -eq "exit_code" }).Count
    timeout = @($matrixResults | Where-Object { $_.failureReason -eq "timeout" }).Count
    unknownStderr = @($matrixResults | Where-Object { $_.failureReason -eq "unknown_stderr" }).Count
  }

  $failureSummary | Add-Member -NotePropertyName failedCaseNamesByReason -NotePropertyValue ([PSCustomObject]@{
    exitCode = @($matrixResults | Where-Object { $_.failureReason -eq "exit_code" } | ForEach-Object { $_.name })
    timeout = @($matrixResults | Where-Object { $_.failureReason -eq "timeout" } | ForEach-Object { $_.name })
    unknownStderr = @($matrixResults | Where-Object { $_.failureReason -eq "unknown_stderr" } | ForEach-Object { $_.name })
  })

  $failedCount = [double]$failureSummary.totalFailedCases
  $caseCount = [double]$matrixResults.Count
  $failureSummary | Add-Member -NotePropertyName failureRate -NotePropertyValue $(if ($caseCount -gt 0) { [Math]::Round($failedCount / $caseCount, 4) } else { 0.0 })
  $failureSummary | Add-Member -NotePropertyName exitCodeRate -NotePropertyValue $(if ($caseCount -gt 0) { [Math]::Round(([double]$failureSummary.exitCode) / $caseCount, 4) } else { 0.0 })
  $failureSummary | Add-Member -NotePropertyName timeoutRate -NotePropertyValue $(if ($caseCount -gt 0) { [Math]::Round(([double]$failureSummary.timeout) / $caseCount, 4) } else { 0.0 })
  $failureSummary | Add-Member -NotePropertyName unknownStderrRate -NotePropertyValue $(if ($caseCount -gt 0) { [Math]::Round(([double]$failureSummary.unknownStderr) / $caseCount, 4) } else { 0.0 })

  $executionOptions = [PSCustomObject]@{
    skipBuild = [bool]$SkipBuild
    failOnUnknownStderr = [bool]$FailOnUnknownStderr
    smokeTimeoutSec = $SmokeTimeoutSec
    endpoint = $smokeEndpoint
    configPath = $configPath
    configHashSha256 = $configHashSha256
    reportJsonPathTemplate = $ReportJsonPath
    reportJsonPathResolved = $resolvedReportPath
  }

  $warnings = @()
  if ($noiseSuppressedTotal -gt 0) {
    $warnings += [PSCustomObject]@{
      code = "known_noise_suppressed"
      count = [int]$noiseSuppressedTotal
      message = "Known gRPC warnings were suppressed from output."
    }
  }

  if (-not $FailOnUnknownStderr -and $unknownStderrTotal -gt 0) {
    $warnings += [PSCustomObject]@{
      code = "unknown_stderr_not_fatal"
      count = [int]$unknownStderrTotal
      message = "Unknown stderr lines were observed but strict mode is disabled."
    }
  }

  if ($compareMismatchWarningTotal -gt 0) {
    $warnings += [PSCustomObject]@{
      code = "compare_mismatch_nonfatal"
      count = [int]$compareMismatchWarningTotal
      message = "CompareImportedAcquisition returned matched=false in smoke; treated as warning for dynamic mock data."
    }
  }

  if ($compareTokenTotal -eq 0) {
    $warnings += [PSCustomObject]@{
      code = "compare_context_token_missing"
      count = [int]$matrixResults.Count
      message = "No grpc_compare_token found in smoke compare detail output."
    }
  }

  $warnings = @($warnings | Sort-Object code)

  $passedCases = @($matrixResults | Where-Object { $_.passed }).Count
  $failedCases = @($matrixResults | Where-Object { -not $_.passed }).Count
  $reportDigest = "passed=$passedCases/$($matrixResults.Count);failed=$failedCases;noise=$noiseSuppressedTotal;warnings=$($warnings.Count);compare_tokens=$($compareContextTokens.Count)"
  $reportStatus = if ($hasFailure) { "FAIL" } else { "PASS" }
  $generatedBy = [PSCustomObject]@{
    script = $scriptName
    runtime = "powershell"
  }

  $report = [PSCustomObject]@{
    reportVersion = "1.7"
    timestampUtc = (Get-Date).ToUniversalTime().ToString("o")
    durationMs = [int]((Get-Date) - $matrixStartedAt).TotalMilliseconds
    status = $reportStatus
    strictMode = [bool]$FailOnUnknownStderr
    smokeTimeoutSec = $SmokeTimeoutSec
    overallPassed = (-not $hasFailure)
    caseCount = $matrixResults.Count
    reportDigest = $reportDigest
    compareContextTokenCount = [int]$compareContextTokens.Count
    compareContextTokens = $compareContextTokens
    generatedBy = $generatedBy
    failedCaseNames = $failedCaseNames
    noiseSuppressedTotal = [int]$noiseSuppressedTotal
    warnings = $warnings
    executionOptions = $executionOptions
    failureSummary = $failureSummary
    cases = $matrixResults
  }

  $reportDir = Split-Path -Parent $resolvedReportPath
  if (-not [string]::IsNullOrWhiteSpace($reportDir) -and -not (Test-Path $reportDir)) {
    New-Item -Path $reportDir -ItemType Directory -Force | Out-Null
  }

  $report | ConvertTo-Json -Depth 6 | Set-Content -Path $resolvedReportPath -Encoding UTF8
  Write-Host "[MATRIX] report written: $resolvedReportPath"
}

if ($hasFailure) {
  Write-Host "[MATRIX] finished with failures"
  exit 1
}

Write-Host "[MATRIX] all cases passed"
exit 0
