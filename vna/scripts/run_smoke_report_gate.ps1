param(
  [switch]$SkipBuild,
  [switch]$FailOnUnknownStderr,
  [switch]$StrictMainline,
  [int]$SmokeTimeoutSec = 20,
  [string]$ReportPath = ".\build-grpc\smoke-matrix-gate-{timestamp}.json",
  [string]$BatchCompareReportPath = "",
  [switch]$FailOnBatchCompareMismatch,
  [switch]$FailOnBatchCompareFailed,
  [switch]$RunUiGrpcE2E,
  [string[]]$FailOnWarningCodes = @(),
  [switch]$AsJson,
  [string]$ResultJsonPath = ""
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
}

if ($null -ne (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue)) {
  $PSNativeCommandUseErrorActionPreference = $false
}

Ensure-MingwRuntime

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$matrixScript = Join-Path $scriptDir "run_grpc_smoke_matrix.ps1"
$validatorScript = Join-Path $scriptDir "validate_smoke_matrix_report.ps1"
$schemaPath = Join-Path $scriptDir "smoke_matrix_report.schema.json"
$batchCompareValidatorScript = Join-Path $scriptDir "validate_batch_compare_report.ps1"
$batchCompareSchemaPath = Join-Path $scriptDir "batch_compare_report.schema.json"

if (-not (Test-Path $matrixScript)) { throw "Missing script: $matrixScript" }
if (-not (Test-Path $validatorScript)) { throw "Missing script: $validatorScript" }
if (-not (Test-Path $schemaPath)) { throw "Missing schema: $schemaPath" }
if (-not (Test-Path $batchCompareValidatorScript)) { throw "Missing script: $batchCompareValidatorScript" }
if (-not (Test-Path $batchCompareSchemaPath)) { throw "Missing schema: $batchCompareSchemaPath" }

$startGrpcScript = Join-Path $scriptDir "start_grpc_for_vscode.ps1"
if ($RunUiGrpcE2E -and -not (Test-Path $startGrpcScript)) {
  throw "Missing script required by -RunUiGrpcE2E: $startGrpcScript"
}

function Resolve-PathPlaceholders {
  param([string]$PathValue)
  if ([string]::IsNullOrWhiteSpace($PathValue)) { return "" }

  $utcNow = [DateTime]::UtcNow
  $localNow = [DateTime]::Now
  $resolved = $PathValue
  $resolved = $resolved.Replace("{timestamp}", $utcNow.ToString("yyyyMMdd-HHmmss"))
  $resolved = $resolved.Replace("{timestampUtc}", $utcNow.ToString("yyyyMMdd-HHmmss"))
  $resolved = $resolved.Replace("{timestampLocal}", $localNow.ToString("yyyyMMdd-HHmmss"))
  return $resolved
}

function Write-ResultJsonIfNeeded {
  param(
    [Parameter(Mandatory = $true)]
    [psobject]$Result,
    [string]$OutputPath
  )

  if ([string]::IsNullOrWhiteSpace($OutputPath)) { return }

  $parentDir = Split-Path -Parent $OutputPath
  if (-not [string]::IsNullOrWhiteSpace($parentDir) -and -not (Test-Path $parentDir)) {
    New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
  }

  $jsonText = $Result | ConvertTo-Json -Depth 6
  Set-Content -Path $OutputPath -Value $jsonText -Encoding UTF8
  Write-Host "[GATE] result json written: $OutputPath"
}

$resolvedReportPath = $ReportPath
$resolvedBatchCompareReportPath = ""
$matchedCodes = @()
$failureMessage = ""
$compareContextTokenCount = 0
$compareContextTokens = @()
$batchCompareSummary = $null
$resolvedResultJsonPath = Resolve-PathPlaceholders $ResultJsonPath
$startedAtUtc = [DateTime]::UtcNow

if ($StrictMainline) {
  $RunUiGrpcE2E = $true
  $FailOnUnknownStderr = $true
  $FailOnBatchCompareMismatch = $true
  $FailOnBatchCompareFailed = $true
  Write-Host "[GATE] strict mainline preset enabled: RunUiGrpcE2E=True, FailOnUnknownStderr=True, FailOnBatchCompareMismatch=True, FailOnBatchCompareFailed=True"
}

try {
  if (-not [System.IO.Path]::IsPathRooted($resolvedReportPath)) {
    $resolvedReportPath = Join-Path $projectRoot $resolvedReportPath
  }

  Write-Host "[GATE] running smoke matrix..."
  & $matrixScript -SkipBuild:$SkipBuild -FailOnUnknownStderr:$FailOnUnknownStderr -SmokeTimeoutSec $SmokeTimeoutSec -ReportJsonPath $resolvedReportPath

  if ($LASTEXITCODE -ne 0) {
    throw "Smoke matrix failed with exit code: $LASTEXITCODE"
  }

  if ($resolvedReportPath.Contains("{timestamp}") -or $resolvedReportPath.Contains("{timestampUtc}") -or $resolvedReportPath.Contains("{timestampLocal}")) {
    $reportDir = Split-Path -Parent $resolvedReportPath
    if ([string]::IsNullOrWhiteSpace($reportDir)) {
      $reportDir = Join-Path $projectRoot "build-grpc"
    }
    $latest = Get-ChildItem -Path $reportDir -Filter "smoke-matrix-gate-*.json" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $latest) { throw "Could not locate generated gate report under build-grpc" }
    $resolvedReportPath = $latest.FullName
  }

  Write-Host "[GATE] validating report: $resolvedReportPath"
  & $validatorScript -ReportPath $resolvedReportPath -SchemaPath $schemaPath -Snapshot

  if ($LASTEXITCODE -ne 0) {
    throw "Report validation failed with exit code: $LASTEXITCODE"
  }

  $report = Get-Content -Path $resolvedReportPath -Raw | ConvertFrom-Json
  if ($null -ne $report.compareContextTokenCount) {
    $compareContextTokenCount = [int]$report.compareContextTokenCount
  }
  if ($null -ne $report.compareContextTokens) {
    $compareContextTokens = @($report.compareContextTokens)
  }

  if ($FailOnWarningCodes.Count -gt 0) {
    $warningCodes = @($report.warnings | ForEach-Object { $_.code })
    $matchedCodes = @($warningCodes | Where-Object { $FailOnWarningCodes -contains $_ } | Select-Object -Unique)
    if ($matchedCodes.Count -gt 0) {
      throw "Gate failed due to warning policy. Matched warning codes: $($matchedCodes -join ', ')"
    }
  }

  if (-not [string]::IsNullOrWhiteSpace($BatchCompareReportPath)) {
    $resolvedBatchCompareReportPath = Resolve-PathPlaceholders $BatchCompareReportPath
    if (-not [System.IO.Path]::IsPathRooted($resolvedBatchCompareReportPath)) {
      $resolvedBatchCompareReportPath = Join-Path $projectRoot $resolvedBatchCompareReportPath
    }

    Write-Host "[GATE] validating batch compare report: $resolvedBatchCompareReportPath"
    & $batchCompareValidatorScript -ReportPath $resolvedBatchCompareReportPath -SchemaPath $batchCompareSchemaPath
    if ($LASTEXITCODE -ne 0) {
      throw "Batch compare report validation failed with exit code: $LASTEXITCODE"
    }

    $batchCompareReport = Get-Content -Path $resolvedBatchCompareReportPath -Raw | ConvertFrom-Json
    $batchCompareSummary = [PSCustomObject]@{
      total = [int]$batchCompareReport.summary.total
      matched = [int]$batchCompareReport.summary.matched
      mismatched = [int]$batchCompareReport.summary.mismatched
      failed = [int]$batchCompareReport.summary.failed
    }

    if ($FailOnBatchCompareMismatch -and $batchCompareSummary.mismatched -gt 0) {
      throw "Gate failed due to batch compare mismatched count: $($batchCompareSummary.mismatched)"
    }

    if ($FailOnBatchCompareFailed -and $batchCompareSummary.failed -gt 0) {
      throw "Gate failed due to batch compare failed count: $($batchCompareSummary.failed)"
    }
  }

  if ($RunUiGrpcE2E) {
    Write-Host "[GATE] running grpc-backed UI E2E..."
    & $startGrpcScript
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to start grpc service for UI E2E. Exit code: $LASTEXITCODE"
    }

    $extensionDir = Join-Path $projectRoot "tools\vscode-extension"
    if (-not (Test-Path $extensionDir)) {
      throw "Missing vscode extension directory: $extensionDir"
    }

    Push-Location $extensionDir
    try {
      npm run test:ui:grpc
      if ($LASTEXITCODE -ne 0) {
        throw "UI grpc E2E failed with exit code: $LASTEXITCODE"
      }
    }
    finally {
      Pop-Location
    }
  }

  $gateResult = [PSCustomObject]@{
    status = "PASS"
    exitCode = 0
    durationMs = [int][Math]::Round(([DateTime]::UtcNow - $startedAtUtc).TotalMilliseconds)
    startedAtUtc = $startedAtUtc.ToString("o")
    finishedAtUtc = [DateTime]::UtcNow.ToString("o")
    reportPath = $resolvedReportPath
    resultJsonPath = $resolvedResultJsonPath
    strictMainline = [bool]$StrictMainline
    runUiGrpcE2E = [bool]$RunUiGrpcE2E
    failOnUnknownStderr = [bool]$FailOnUnknownStderr
    failOnBatchCompareMismatch = [bool]$FailOnBatchCompareMismatch
    failOnBatchCompareFailed = [bool]$FailOnBatchCompareFailed
    smokeTimeoutSec = $SmokeTimeoutSec
    failOnWarningCodes = @($FailOnWarningCodes)
    matchedWarningCodes = @($matchedCodes)
    batchCompareReportPath = $resolvedBatchCompareReportPath
    batchCompareSummary = $batchCompareSummary
    compareContextTokenCount = $compareContextTokenCount
    compareContextTokens = @($compareContextTokens)
    error = ""
  }

  Write-ResultJsonIfNeeded -Result $gateResult -OutputPath $resolvedResultJsonPath

  if ($AsJson) {
    $gateResult | ConvertTo-Json -Depth 6
  }
  else {
    Write-Host "[GATE][RESULT] status=PASS reportPath=$resolvedReportPath strictMainline=$([bool]$StrictMainline) runUiGrpcE2E=$([bool]$RunUiGrpcE2E) failOnUnknownStderr=$([bool]$FailOnUnknownStderr) smokeTimeoutSec=$SmokeTimeoutSec"
  }

  Write-Host "[GATE][PASS] smoke report gate passed"
  exit 0
}
catch {
  $failureMessage = $_.Exception.Message
  $gateResult = [PSCustomObject]@{
    status = "FAIL"
    exitCode = 1
    durationMs = [int][Math]::Round(([DateTime]::UtcNow - $startedAtUtc).TotalMilliseconds)
    startedAtUtc = $startedAtUtc.ToString("o")
    finishedAtUtc = [DateTime]::UtcNow.ToString("o")
    reportPath = $resolvedReportPath
    resultJsonPath = $resolvedResultJsonPath
    strictMainline = [bool]$StrictMainline
    runUiGrpcE2E = [bool]$RunUiGrpcE2E
    failOnUnknownStderr = [bool]$FailOnUnknownStderr
    failOnBatchCompareMismatch = [bool]$FailOnBatchCompareMismatch
    failOnBatchCompareFailed = [bool]$FailOnBatchCompareFailed
    smokeTimeoutSec = $SmokeTimeoutSec
    failOnWarningCodes = @($FailOnWarningCodes)
    matchedWarningCodes = @($matchedCodes)
    batchCompareReportPath = $resolvedBatchCompareReportPath
    batchCompareSummary = $batchCompareSummary
    compareContextTokenCount = $compareContextTokenCount
    compareContextTokens = @($compareContextTokens)
    error = $failureMessage
  }

  Write-ResultJsonIfNeeded -Result $gateResult -OutputPath $resolvedResultJsonPath

  if ($AsJson) {
    $gateResult | ConvertTo-Json -Depth 6
  }
  else {
    Write-Host "[GATE][RESULT] status=FAIL reportPath=$resolvedReportPath strictMainline=$([bool]$StrictMainline) runUiGrpcE2E=$([bool]$RunUiGrpcE2E) failOnUnknownStderr=$([bool]$FailOnUnknownStderr) smokeTimeoutSec=$SmokeTimeoutSec error=$failureMessage"
  }

  Write-Host "[GATE][FAIL] $failureMessage"
  exit 1
}
