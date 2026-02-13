param(
  [Parameter(Mandatory = $true)]
  [string]$ReportPath,
  [switch]$AsJson
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $ReportPath)) {
  throw "Report file not found: $ReportPath"
}

$report = Get-Content -Path $ReportPath -Raw | ConvertFrom-Json
$warningCodes = @($report.warnings | ForEach-Object { $_.code })
$warningCodeText = if ($warningCodes.Count -gt 0) { $warningCodes -join "," } else { "none" }

$summary = [PSCustomObject]@{
  reportVersion = $report.reportVersion
  status = $report.status
  overallPassed = [bool]$report.overallPassed
  caseCount = [int]$report.caseCount
  failedCases = [int]$report.failureSummary.totalFailedCases
  noiseSuppressedTotal = [int]$report.noiseSuppressedTotal
  warningCount = @($report.warnings).Count
  warningCodes = $warningCodes
  digest = $report.reportDigest
}

if ($AsJson) {
  $summary | ConvertTo-Json -Depth 4
  exit 0
}

Write-Host "[REPORT][SUMMARY] status=$($summary.status) passed=$($summary.caseCount - $summary.failedCases)/$($summary.caseCount) failed=$($summary.failedCases) warnings=$($summary.warningCount) warningCodes=$warningCodeText noise=$($summary.noiseSuppressedTotal) version=$($summary.reportVersion)"
Write-Host "[REPORT][DIGEST] $($summary.digest)"
exit 0
