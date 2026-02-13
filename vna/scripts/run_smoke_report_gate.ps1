param(
  [switch]$SkipBuild,
  [switch]$FailOnUnknownStderr,
  [int]$SmokeTimeoutSec = 20,
  [string]$ReportPath = ".\build-grpc\smoke-matrix-gate-{timestamp}.json",
  [string[]]$FailOnWarningCodes = @(),
  [switch]$AsJson
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$matrixScript = Join-Path $scriptDir "run_grpc_smoke_matrix.ps1"
$validatorScript = Join-Path $scriptDir "validate_smoke_matrix_report.ps1"
$schemaPath = Join-Path $scriptDir "smoke_matrix_report.schema.json"

if (-not (Test-Path $matrixScript)) { throw "Missing script: $matrixScript" }
if (-not (Test-Path $validatorScript)) { throw "Missing script: $validatorScript" }
if (-not (Test-Path $schemaPath)) { throw "Missing schema: $schemaPath" }

$resolvedReportPath = $ReportPath
$matchedCodes = @()
$failureMessage = ""

try {
  Write-Host "[GATE] running smoke matrix..."
  & $matrixScript -SkipBuild:$SkipBuild -FailOnUnknownStderr:$FailOnUnknownStderr -SmokeTimeoutSec $SmokeTimeoutSec -ReportJsonPath $ReportPath

  if ($LASTEXITCODE -ne 0) {
    throw "Smoke matrix failed with exit code: $LASTEXITCODE"
  }

  if ($resolvedReportPath.Contains("{timestamp}") -or $resolvedReportPath.Contains("{timestampUtc}") -or $resolvedReportPath.Contains("{timestampLocal}")) {
    $latest = Get-ChildItem -Path (Join-Path $projectRoot "build-grpc") -Filter "smoke-matrix-gate-*.json" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $latest) { throw "Could not locate generated gate report under build-grpc" }
    $resolvedReportPath = $latest.FullName
  }

  Write-Host "[GATE] validating report: $resolvedReportPath"
  & $validatorScript -ReportPath $resolvedReportPath -SchemaPath $schemaPath -Snapshot

  if ($LASTEXITCODE -ne 0) {
    throw "Report validation failed with exit code: $LASTEXITCODE"
  }

  if ($FailOnWarningCodes.Count -gt 0) {
    $report = Get-Content -Path $resolvedReportPath -Raw | ConvertFrom-Json
    $warningCodes = @($report.warnings | ForEach-Object { $_.code })
    $matchedCodes = @($warningCodes | Where-Object { $FailOnWarningCodes -contains $_ } | Select-Object -Unique)
    if ($matchedCodes.Count -gt 0) {
      throw "Gate failed due to warning policy. Matched warning codes: $($matchedCodes -join ', ')"
    }
  }

  $gateResult = [PSCustomObject]@{
    status = "PASS"
    reportPath = $resolvedReportPath
    failOnUnknownStderr = [bool]$FailOnUnknownStderr
    smokeTimeoutSec = $SmokeTimeoutSec
    failOnWarningCodes = @($FailOnWarningCodes)
    matchedWarningCodes = @($matchedCodes)
    error = ""
  }

  if ($AsJson) {
    $gateResult | ConvertTo-Json -Depth 4
  }
  else {
    Write-Host "[GATE][RESULT] status=PASS reportPath=$resolvedReportPath failOnUnknownStderr=$([bool]$FailOnUnknownStderr) smokeTimeoutSec=$SmokeTimeoutSec"
  }

  Write-Host "[GATE][PASS] smoke report gate passed"
  exit 0
}
catch {
  $failureMessage = $_.Exception.Message
  $gateResult = [PSCustomObject]@{
    status = "FAIL"
    reportPath = $resolvedReportPath
    failOnUnknownStderr = [bool]$FailOnUnknownStderr
    smokeTimeoutSec = $SmokeTimeoutSec
    failOnWarningCodes = @($FailOnWarningCodes)
    matchedWarningCodes = @($matchedCodes)
    error = $failureMessage
  }

  if ($AsJson) {
    $gateResult | ConvertTo-Json -Depth 4
  }
  else {
    Write-Host "[GATE][RESULT] status=FAIL reportPath=$resolvedReportPath failOnUnknownStderr=$([bool]$FailOnUnknownStderr) smokeTimeoutSec=$SmokeTimeoutSec error=$failureMessage"
  }

  Write-Host "[GATE][FAIL] $failureMessage"
  exit 1
}
