param(
  [string]$BuildDir = "$PSScriptRoot\..\build",
  [int]$PerTestTimeoutSec = 120
)

$ErrorActionPreference = 'Stop'

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

$RepoDir = (Resolve-Path "$PSScriptRoot\..").Path

function Stop-ProcessTree {
  param(
    [int]$ProcessId
  )

  try {
    taskkill /F /T /PID $ProcessId | Out-Null
  } catch {
    try {
      Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
    } catch {
    }
  }
}

$tests = @(
  'easy_time_domain_processor_test.exe',
  'easy_trigger_chain_validator_test.exe',
  'easy_hardware_driver_factory_test.exe',
  'easy_pxi_driver_test.exe',
  'easy_usb_vna_driver_test.exe',
  'easy_grpc_bootstrap_paths_test.exe',
  'easy_measurement_pipeline_test.exe',
  'easy_acquisition_comparator_test.exe',
  'easy_measurement_exporter_test.exe',
  'easy_s_parameter_math_test.exe',
  'easy_topology_manager_test.exe',
  'easy_resource_manager_test.exe',
  'easy_plugin_manager_test.exe',
  'easy_plugin_lifecycle_test.exe',
  'easy_instance_manager_test.exe',
  'easy_instance_manager_from_topology_test.exe',
  'easy_vna_runtime_test.exe',
  'easy_vna_control_service_test.exe',
  'easy_resource_broker_service_test.exe',
  'easy_process_manager_test.exe',
  'easy_service_config_test.exe',
  'easy_service_flow_integration_test.exe',
  'easy_multi_instance_parallel_integration_test.exe',
  'easy_service_status_service_test.exe',
  'easy_service_status_concurrency_test.exe',
  'easy_vna_control_inproc_handler_test.exe'
)

$failed = @()

foreach ($test in $tests) {
  $path = Join-Path $BuildDir $test
  if (-not (Test-Path $path)) {
    $failed += [pscustomobject]@{
      Test = $test
      Reason = 'missing-binary'
      Detail = $path
    }
    Write-Host "[FAIL] $test (missing binary)"
    continue
  }

  Write-Host "[RUN] $test"

  $startInfo = New-Object System.Diagnostics.ProcessStartInfo
  $startInfo.FileName = $path
  $startInfo.WorkingDirectory = $RepoDir
  $startInfo.UseShellExecute = $false
  $startInfo.RedirectStandardOutput = $false
  $startInfo.RedirectStandardError = $false

  $proc = [System.Diagnostics.Process]::Start($startInfo)
  if ($null -eq $proc) {
    $failed += [pscustomobject]@{
      Test = $test
      Reason = 'start-failed'
      Detail = 'process start returned null'
    }
    Write-Host "[FAIL] $test (start failed)"
    continue
  }

  $finished = $proc.WaitForExit($PerTestTimeoutSec * 1000)
  if (-not $finished) {
    Stop-ProcessTree -ProcessId $proc.Id
    $failed += [pscustomobject]@{
      Test = $test
      Reason = 'timeout'
      Detail = "exceeded ${PerTestTimeoutSec}s"
    }
    Write-Host "[TIMEOUT] $test (>${PerTestTimeoutSec}s, process tree killed)"
    continue
  }

  $exitCode = $proc.ExitCode
  if ($exitCode -ne 0) {
    $failed += [pscustomobject]@{
      Test = $test
      Reason = 'non-zero-exit'
      Detail = "exit=$exitCode"
    }
    Write-Host "[FAIL] $test (exit=$exitCode)"
    continue
  }

  Write-Host "[PASS] $test"
}

if ($failed.Count -gt 0) {
  Write-Host "`nEasy test summary: $($tests.Count - $failed.Count)/$($tests.Count) passed, $($failed.Count) failed."
  foreach ($item in $failed) {
    Write-Host "  - $($item.Test): $($item.Reason) ($($item.Detail))"
  }
  exit 1
}

Write-Host "All easy tests passed."
