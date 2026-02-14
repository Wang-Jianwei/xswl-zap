param(
  [Parameter(Mandatory = $true)]
  [string]$ReportPath,
  [string]$SchemaPath = ""
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
  throw "Batch compare report file not found: $ReportPath"
}

$report = Get-Content -Path $ReportPath -Raw | ConvertFrom-Json

$topRequired = @("requestId", "generatedAt", "instanceId", "scanDir", "mode", "sampleCount", "tolerance", "summary", "cases")

if (-not [string]::IsNullOrWhiteSpace($SchemaPath)) {
  if (-not (Test-Path $SchemaPath)) {
    throw "Schema file not found: $SchemaPath"
  }

  $schema = Get-Content -Path $SchemaPath -Raw | ConvertFrom-Json
  if ($schema.required) {
    $topRequired = @($schema.required)
  }
}

Assert-RequiredProps -Object $report -Required $topRequired -Context "batch compare report"
Assert-RequiredProps -Object $report.summary -Required @("total", "matched", "mismatched", "failed") -Context "batch compare report.summary"

$caseItems = @($report.cases)

if ($caseItems.Count -ne [int]$report.summary.total) {
  throw "summary.total mismatch: total=$($report.summary.total) cases=$($caseItems.Count)"
}

$matchedCount = @($caseItems | Where-Object { $_.status -eq "matched" }).Count
$mismatchedCount = @($caseItems | Where-Object { $_.status -eq "mismatched" }).Count
$failedCount = @($caseItems | Where-Object { $_.status -eq "failed" }).Count

if ($matchedCount -ne [int]$report.summary.matched) {
  throw "summary.matched mismatch: summary=$($report.summary.matched) actual=$matchedCount"
}
if ($mismatchedCount -ne [int]$report.summary.mismatched) {
  throw "summary.mismatched mismatch: summary=$($report.summary.mismatched) actual=$mismatchedCount"
}
if ($failedCount -ne [int]$report.summary.failed) {
  throw "summary.failed mismatch: summary=$($report.summary.failed) actual=$failedCount"
}

Write-Host "[BATCH-REPORT][PASS] validation ok total=$($report.summary.total) matched=$matchedCount mismatched=$mismatchedCount failed=$failedCount"
exit 0
