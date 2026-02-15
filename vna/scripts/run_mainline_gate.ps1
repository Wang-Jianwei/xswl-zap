param(
  [ValidateSet("standard", "strict", "ci")]
  [string]$Profile = "strict",
  [switch]$SkipBuild,
  [int]$SmokeTimeoutSec = 20,
  [string]$ReportPath = ".\build-grpc\smoke-matrix-gate-{timestamp}.json",
  [string]$BatchCompareReportPath = "",
  [switch]$GenerateBatchCompareReport,
  [string]$BatchCompareInputDir = ".\build-grpc",
  [string]$BatchCompareOutputJsonPath = ".\build-grpc\batch_compare_report_{timestamp}.json",
  [string]$BatchCompareEndpoint = "127.0.0.1:50051",
  [string]$BatchCompareInstanceId = "inst0",
  [ValidateSet("frequency", "time")]
  [string]$BatchCompareMode = "frequency",
  [int]$BatchCompareSampleCount = 128,
  [int]$BatchCompareTimeoutMs = 1000,
  [double]$BatchCompareTolerance = 1e-6,
  [switch]$RequireBatchCompareReport,
  [switch]$FailOnBatchCompareMismatch,
  [switch]$FailOnBatchCompareFailed,
  [string]$ResultJsonPath = ".\build-grpc\mainline-gate-result-{timestamp}.json",
  [string[]]$FailOnWarningCodes = @(),
  [switch]$AsJson
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$gateScript = Join-Path $scriptDir "run_smoke_report_gate.ps1"
$batchCompareScript = Join-Path $scriptDir "run_grpc_batch_compare.ps1"
if (-not (Test-Path $gateScript)) {
  throw "Missing script: $gateScript"
}
if (-not (Test-Path $batchCompareScript)) {
  throw "Missing script: $batchCompareScript"
}

$gateParams = @{
  SkipBuild = [bool]$SkipBuild
  SmokeTimeoutSec = $SmokeTimeoutSec
  ReportPath = $ReportPath
  ResultJsonPath = $ResultJsonPath
}

if (-not [string]::IsNullOrWhiteSpace($BatchCompareReportPath)) {
  $gateParams.BatchCompareReportPath = $BatchCompareReportPath
}

if ($RequireBatchCompareReport) {
  $gateParams.RequireBatchCompareReport = $true
}

if ($FailOnBatchCompareMismatch) {
  $gateParams.FailOnBatchCompareMismatch = $true
}

if ($FailOnBatchCompareFailed) {
  $gateParams.FailOnBatchCompareFailed = $true
}

if ($AsJson) {
  $gateParams.AsJson = $true
}

if ($Profile -eq "strict" -or $Profile -eq "ci") {
  $gateParams.StrictMainline = $true
  $gateParams.RequireBatchCompareReport = $true
}

$autoGenerateBatchCompare = $false
if ($GenerateBatchCompareReport) {
  $autoGenerateBatchCompare = $true
}
elseif (($Profile -eq "strict" -or $Profile -eq "ci") -and [string]::IsNullOrWhiteSpace($BatchCompareReportPath)) {
  $autoGenerateBatchCompare = $true
}

if ($autoGenerateBatchCompare) {
  Write-Host "[MAINLINE-GATE] generating batch compare report via run_grpc_batch_compare.ps1"
  $batchCompareResultJson = & $batchCompareScript -SkipBuild:$SkipBuild `
    -Endpoint $BatchCompareEndpoint `
    -InputDir $BatchCompareInputDir `
    -OutputJsonPath $BatchCompareOutputJsonPath `
    -InstanceId $BatchCompareInstanceId `
    -Mode $BatchCompareMode `
    -SampleCount $BatchCompareSampleCount `
    -TimeoutMs $BatchCompareTimeoutMs `
    -Tolerance $BatchCompareTolerance `
    -AsJson

  if ($LASTEXITCODE -ne 0) {
    throw "run_grpc_batch_compare.ps1 failed with exit code: $LASTEXITCODE"
  }

  $batchCompareResult = $batchCompareResultJson | ConvertFrom-Json
  if ([string]::IsNullOrWhiteSpace($batchCompareResult.outputJsonPath)) {
    throw "run_grpc_batch_compare.ps1 returned empty outputJsonPath"
  }

  $gateParams.BatchCompareReportPath = [string]$batchCompareResult.outputJsonPath
}
elseif ($Profile -eq "ci" -and [string]::IsNullOrWhiteSpace($BatchCompareReportPath)) {
  $gateParams.BatchCompareReportPath = "{latestBatchCompareReport}"
}

if ($Profile -eq "ci" -and $ResultJsonPath -eq ".\build-grpc\mainline-gate-result-{timestamp}.json") {
  $gateParams.ResultJsonPath = ".\build-grpc\ci-mainline-gate-{timestamp}.json"
}

if ($FailOnWarningCodes.Count -gt 0) {
  $gateParams.FailOnWarningCodes = $FailOnWarningCodes
}

Write-Host "[MAINLINE-GATE] profile=$Profile skipBuild=$([bool]$SkipBuild) timeoutSec=$SmokeTimeoutSec autoGenerateBatchCompare=$autoGenerateBatchCompare"
& $gateScript @gateParams
exit $LASTEXITCODE
