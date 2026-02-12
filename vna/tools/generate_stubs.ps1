param(
  [string]$ProtoFile = "$PSScriptRoot\..\proto\vna.proto",
  [string]$OutCpp = "$PSScriptRoot\..\generated\cpp",
  [string]$OutTs = "$PSScriptRoot\..\generated\ts"
)

$ErrorActionPreference = 'Stop'

function Require-Command([string]$name) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if (-not $cmd) {
    throw "Missing required tool: $name (not found in PATH)"
  }
}

Require-Command protoc

if (-not (Test-Path $ProtoFile)) {
  throw "Proto not found: $ProtoFile"
}

New-Item -ItemType Directory -Force -Path $OutCpp | Out-Null
New-Item -ItemType Directory -Force -Path $OutTs | Out-Null

Write-Host "Generating C++ protobuf sources..."
protoc --proto_path (Split-Path $ProtoFile) --cpp_out $OutCpp (Split-Path $ProtoFile -Leaf)

Write-Host "NOTE: gRPC C++ / grpc-web stubs require additional plugins (grpc_cpp_plugin, protoc-gen-grpc-web)."
Write-Host "This script currently generates protobuf messages only; extend when toolchain is installed."
