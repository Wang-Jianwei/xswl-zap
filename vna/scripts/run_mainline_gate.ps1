param(
  [ValidateSet("standard", "strict", "ci")]
  [string]$Profile = "strict",
  [switch]$SkipBuild,
  [int]$SmokeTimeoutSec = 20,
  [string]$ReportPath = ".\build-grpc\smoke-matrix-gate-{timestamp}.json",
  [string]$ResultJsonPath = ".\build-grpc\mainline-gate-result-{timestamp}.json",
  [string[]]$FailOnWarningCodes = @(),
  [switch]$AsJson
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$gateScript = Join-Path $scriptDir "run_smoke_report_gate.ps1"
if (-not (Test-Path $gateScript)) {
  throw "Missing script: $gateScript"
}

$gateParams = @{
  SkipBuild = [bool]$SkipBuild
  SmokeTimeoutSec = $SmokeTimeoutSec
  ReportPath = $ReportPath
  ResultJsonPath = $ResultJsonPath
}

if ($AsJson) {
  $gateParams.AsJson = $true
}

if ($Profile -eq "strict" -or $Profile -eq "ci") {
  $gateParams.StrictMainline = $true
}

if ($Profile -eq "ci" -and $ResultJsonPath -eq ".\build-grpc\mainline-gate-result-{timestamp}.json") {
  $gateParams.ResultJsonPath = ".\build-grpc\ci-mainline-gate-{timestamp}.json"
}

if ($FailOnWarningCodes.Count -gt 0) {
  $gateParams.FailOnWarningCodes = $FailOnWarningCodes
}

Write-Host "[MAINLINE-GATE] profile=$Profile skipBuild=$([bool]$SkipBuild) timeoutSec=$SmokeTimeoutSec"
& $gateScript @gateParams
exit $LASTEXITCODE
