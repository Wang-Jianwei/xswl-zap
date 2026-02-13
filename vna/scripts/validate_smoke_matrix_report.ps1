param(
  [Parameter(Mandatory = $true)]
  [string]$ReportPath,
  [string]$SchemaPath = "",
  [switch]$Snapshot
)

$ErrorActionPreference = "Stop"

function Assert-HasProperty {
  param(
    [Parameter(Mandatory = $true)]$Object,
    [Parameter(Mandatory = $true)][string]$PropertyName,
    [Parameter(Mandatory = $true)][string]$Context
  )

  if (-not ($Object.PSObject.Properties.Name -contains $PropertyName)) {
    throw "Missing required property '$PropertyName' in $Context"
  }
}

function Assert-RequiredProps {
  param(
    [Parameter(Mandatory = $true)]$Object,
    [Parameter(Mandatory = $true)][string[]]$Required,
    [Parameter(Mandatory = $true)][string]$Context
  )

  foreach ($name in $Required) {
    Assert-HasProperty -Object $Object -PropertyName $name -Context $Context
  }
}

if (-not (Test-Path $ReportPath)) {
  throw "Report file not found: $ReportPath"
}

$report = Get-Content -Path $ReportPath -Raw | ConvertFrom-Json

$topRequired = @("reportVersion", "status", "overallPassed", "caseCount", "reportDigest", "executionOptions", "failureSummary", "cases")

if (-not [string]::IsNullOrWhiteSpace($SchemaPath)) {
  if (-not (Test-Path $SchemaPath)) {
    throw "Schema file not found: $SchemaPath"
  }

  $schema = Get-Content -Path $SchemaPath -Raw | ConvertFrom-Json
  if ($schema.required) {
    $topRequired = @($schema.required)
  }
}

Assert-RequiredProps -Object $report -Required $topRequired -Context "report"

# Semantic consistency checks
if (($report.status -eq "PASS") -ne ([bool]$report.overallPassed)) {
  throw "status/overallPassed mismatch: status=$($report.status) overallPassed=$($report.overallPassed)"
}

if (@($report.cases).Count -ne [int]$report.caseCount) {
  throw "caseCount mismatch: caseCount=$($report.caseCount) actual=$(@($report.cases).Count)"
}

if ($report.failureSummary.totalFailedCases -ne @($report.failedCaseNames).Count) {
  throw "failedCaseNames mismatch: totalFailedCases=$($report.failureSummary.totalFailedCases) listCount=$(@($report.failedCaseNames).Count)"
}

# Snapshot shape checks (versioned key-set expectations)
if ($Snapshot) {
  $expectedTopKeys = @(
    "reportVersion", "timestampUtc", "durationMs", "status", "strictMode", "smokeTimeoutSec",
    "overallPassed", "caseCount", "reportDigest", "generatedBy", "failedCaseNames",
    "noiseSuppressedTotal", "warnings", "executionOptions", "failureSummary", "cases"
  )

  $actualTopKeys = @($report.PSObject.Properties.Name)
  $missing = @($expectedTopKeys | Where-Object { $actualTopKeys -notcontains $_ })
  if ($missing.Count -gt 0) {
    throw "Snapshot mismatch. Missing top-level keys: $($missing -join ', ')"
  }

  if (@($report.cases).Count -gt 0) {
    $expectedCaseKeys = @(
      "caseIndex", "name", "throttleEveryFrames", "throttleMs", "streamFrames",
      "durationMs", "unaryExitCode", "streamExitCode", "unaryTimedOut", "streamTimedOut",
      "suppressedNoiseCount", "unknownStderrCount", "failureReason", "resultDigest", "passed"
    )
    $actualCaseKeys = @($report.cases[0].PSObject.Properties.Name)
    $missingCase = @($expectedCaseKeys | Where-Object { $actualCaseKeys -notcontains $_ })
    if ($missingCase.Count -gt 0) {
      throw "Snapshot mismatch. Missing case keys: $($missingCase -join ', ')"
    }
  }
}

Write-Host "[REPORT][PASS] validation ok reportVersion=$($report.reportVersion) cases=$($report.caseCount)"
exit 0
