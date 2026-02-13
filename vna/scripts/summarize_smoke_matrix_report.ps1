param(
  [Parameter(Mandatory = $true)]
  [string]$ReportPath,
  [switch]$AsJson,
  [switch]$CompactJson,
  [string]$OutputJsonPath = ""
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $ReportPath)) {
  throw "Report file not found: $ReportPath"
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
  reportPath = $ReportPath
}

$jsonText = if ($CompactJson) {
  $summary | ConvertTo-Json -Depth 4 -Compress
}
else {
  $summary | ConvertTo-Json -Depth 4
}

$resolvedOutputJsonPath = Resolve-PathPlaceholders $OutputJsonPath
if (-not [string]::IsNullOrWhiteSpace($resolvedOutputJsonPath)) {
  $parentDir = Split-Path -Parent $resolvedOutputJsonPath
  if (-not [string]::IsNullOrWhiteSpace($parentDir) -and -not (Test-Path $parentDir)) {
    New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
  }
  Set-Content -Path $resolvedOutputJsonPath -Value $jsonText -Encoding UTF8
  Write-Host "[REPORT] summary json written: $resolvedOutputJsonPath"
}

if ($AsJson) {
  $jsonText
  exit 0
}

Write-Host "[REPORT][SUMMARY] status=$($summary.status) passed=$($summary.caseCount - $summary.failedCases)/$($summary.caseCount) failed=$($summary.failedCases) warnings=$($summary.warningCount) warningCodes=$warningCodeText noise=$($summary.noiseSuppressedTotal) version=$($summary.reportVersion)"
Write-Host "[REPORT][DIGEST] $($summary.digest)"
exit 0
