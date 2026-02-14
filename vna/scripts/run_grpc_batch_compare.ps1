param(
  [switch]$SkipBuild,
  [string]$Endpoint = "127.0.0.1:50051",
  [string]$InputDir = ".\build-grpc",
  [string]$OutputJsonPath = ".\build-grpc\batch_compare_report_{timestamp}.json",
  [string]$InstanceId = "inst0",
  [ValidateSet("frequency", "time")]
  [string]$Mode = "frequency",
  [int]$SampleCount = 128,
  [int]$TimeoutMs = 1000,
  [double]$Tolerance = 1e-6,
  [switch]$FailOnMismatch,
  [switch]$FailOnFailed
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

Ensure-MingwRuntime

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir

if (-not $SkipBuild) {
  & (Join-Path $scriptDir "build_grpc_adapter.ps1")
  if ($LASTEXITCODE -ne 0) {
    throw "build_grpc_adapter.ps1 failed with exit code: $LASTEXITCODE"
  }
}

$exePath = Join-Path $projectRoot "build-grpc\easy_grpc_batch_compare.exe"
if (-not (Test-Path $exePath)) {
  throw "Missing executable: $exePath"
}

$resolvedInputDir = $InputDir
if (-not [System.IO.Path]::IsPathRooted($resolvedInputDir)) {
  $resolvedInputDir = Join-Path $projectRoot $resolvedInputDir
}

$resolvedOutputJsonPath = Resolve-PathPlaceholders $OutputJsonPath
if (-not [System.IO.Path]::IsPathRooted($resolvedOutputJsonPath)) {
  $resolvedOutputJsonPath = Join-Path $projectRoot $resolvedOutputJsonPath
}

$outputDir = Split-Path -Parent $resolvedOutputJsonPath
if (-not [string]::IsNullOrWhiteSpace($outputDir) -and -not (Test-Path $outputDir)) {
  New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$args = @(
  "--endpoint", $Endpoint,
  "--input-dir", $resolvedInputDir,
  "--output-json", $resolvedOutputJsonPath,
  "--instance-id", $InstanceId,
  "--mode", $Mode,
  "--sample-count", $SampleCount,
  "--timeout-ms", $TimeoutMs,
  "--tolerance", $Tolerance
)

if ($FailOnMismatch) {
  $args += "--fail-on-mismatch"
}
if ($FailOnFailed) {
  $args += "--fail-on-failed"
}

Write-Host "[BATCH-COMPARE] endpoint=$Endpoint inputDir=$resolvedInputDir output=$resolvedOutputJsonPath mode=$Mode sampleCount=$SampleCount tolerance=$Tolerance"
& $exePath @args
$exitCode = $LASTEXITCODE

if ($exitCode -ne 0) {
  throw "easy_grpc_batch_compare failed with exit code: $exitCode"
}

Write-Host "[BATCH-COMPARE] done report=$resolvedOutputJsonPath"
