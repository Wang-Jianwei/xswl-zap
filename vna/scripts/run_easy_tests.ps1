param(
  [string]$BuildDir = "$PSScriptRoot\..\build"
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

$tests = @(
  'easy_time_domain_processor_test.exe',
  'easy_trigger_chain_validator_test.exe',
  'easy_hardware_driver_factory_test.exe',
  'easy_pxi_driver_test.exe',
  'easy_usb_vna_driver_test.exe',
  'easy_grpc_bootstrap_paths_test.exe',
  'easy_measurement_pipeline_test.exe',
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
foreach ($test in $tests) {
  $path = Join-Path $BuildDir $test
  if (-not (Test-Path $path)) {
    throw "Missing test binary: $path"
  }

  Write-Host "[RUN] $test"
  & $path
  if ($LASTEXITCODE -ne 0) {
    throw "Test failed: $test (exit=$LASTEXITCODE)"
  }
}

Write-Host "All easy tests passed."
