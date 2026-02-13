param()

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir

$env:PATH = "C:\msys64\mingw64\bin;C:\Program Files\nodejs;C:\Users\Administrator\AppData\Roaming\npm;" + $env:PATH

Write-Host "[GRPC] regenerate stubs using MSYS2 protoc"
& "$projectRoot\scripts\generate_proto.ps1" `
  -ProtocPath "C:\msys64\mingw64\bin\protoc.exe" `
  -GrpcPluginPath "C:\msys64\mingw64\bin\grpc_cpp_plugin.exe"

Write-Host "[GRPC] configure preset grpc-mingw64"
cmake --preset grpc-mingw64

Write-Host "[GRPC] build targets vna_grpc_service_adapter, vna_grpc_server, vna_grpc_client_smoke, vna_grpc_stream_smoke and vna_grpc_service_status_mapping_test"
cmake --build --preset grpc-mingw64 --target vna_grpc_service_adapter vna_grpc_server vna_grpc_client_smoke vna_grpc_stream_smoke vna_grpc_service_status_mapping_test

Write-Host "[GRPC] done"
