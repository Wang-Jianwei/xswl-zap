param(
    [string]$ProtoFile = "vna.proto",
    [string]$ProtoDir = "",
    [string]$OutDir = "",
    [string]$TsOutDir = "",
    [string]$ProtocPath = "",
    [string]$GrpcPluginPath = "",
    [string]$TsPluginPath = ""
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir

if ([string]::IsNullOrWhiteSpace($ProtoDir)) {
    $ProtoDir = Join-Path $projectRoot "proto"
}
if ([string]::IsNullOrWhiteSpace($OutDir)) {
    $OutDir = Join-Path $projectRoot "generated/cpp"
}
if ([string]::IsNullOrWhiteSpace($TsOutDir)) {
    $TsOutDir = Join-Path $projectRoot "generated/ts"
}

if ([string]::IsNullOrWhiteSpace($ProtocPath)) {
    $protocCommand = Get-Command protoc -ErrorAction SilentlyContinue
    if ($null -eq $protocCommand) {
        throw "protoc not found in PATH."
    }
    $ProtocPath = $protocCommand.Source
}

if ([string]::IsNullOrWhiteSpace($GrpcPluginPath)) {
    $grpcCommand = Get-Command grpc_cpp_plugin -ErrorAction SilentlyContinue
    if ($null -eq $grpcCommand) {
        throw "grpc_cpp_plugin not found in PATH."
    }
    $GrpcPluginPath = $grpcCommand.Source
}

if ([string]::IsNullOrWhiteSpace($TsPluginPath)) {
    $candidatePaths = @(
        (Join-Path $projectRoot "tools\vscode-extension\node_modules\.bin\protoc-gen-ts_proto.cmd"),
        (Join-Path $projectRoot "tools\vscode-extension\node_modules\.bin\protoc-gen-ts_proto"),
        (Join-Path $projectRoot "node_modules\.bin\protoc-gen-ts_proto.cmd"),
        (Join-Path $projectRoot "node_modules\.bin\protoc-gen-ts_proto"),
        (Join-Path $env:APPDATA "npm\protoc-gen-ts_proto.cmd"),
        (Join-Path $env:APPDATA "npm\protoc-gen-ts_proto")
    )

    foreach ($candidate in $candidatePaths) {
        if (-not [string]::IsNullOrWhiteSpace($candidate) -and (Test-Path $candidate)) {
            $TsPluginPath = $candidate
            break
        }
    }

    $tsCommand = $null
    if ([string]::IsNullOrWhiteSpace($TsPluginPath)) {
        $tsCommand = Get-Command protoc-gen-ts_proto.cmd -ErrorAction SilentlyContinue
    }
    if ($null -eq $tsCommand) {
        $tsCommand = Get-Command protoc-gen-ts_proto -ErrorAction SilentlyContinue
    }

    if ([string]::IsNullOrWhiteSpace($TsPluginPath)) {
        if ($null -eq $tsCommand) {
            throw "protoc-gen-ts_proto not found. Run 'npm install --ignore-scripts' in vna/tools/vscode-extension, or install it globally."
        }
        $TsPluginPath = $tsCommand.Source
    }

    if ($TsPluginPath.EndsWith(".ps1")) {
        throw "protoc-gen-ts_proto resolved to a .ps1 wrapper, which protoc cannot execute directly on Windows. Please use protoc-gen-ts_proto.cmd."
    }
}

$protoPath = Join-Path $ProtoDir $ProtoFile
if (-not (Test-Path $protoPath)) {
    throw "Proto file not found: $protoPath"
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
New-Item -ItemType Directory -Force -Path $TsOutDir | Out-Null

Write-Host "[PROTO] protoc      : $ProtocPath"
Write-Host "[PROTO] grpc_plugin : $GrpcPluginPath"
Write-Host "[PROTO] ts_plugin   : $TsPluginPath"
Write-Host "[PROTO] input       : $protoPath"
Write-Host "[PROTO] output_cpp  : $OutDir"
Write-Host "[PROTO] output_ts   : $TsOutDir"

& $ProtocPath `
  -I $ProtoDir `
  --cpp_out=$OutDir `
  --grpc_out=$OutDir `
  --plugin=protoc-gen-grpc=$GrpcPluginPath `
  $protoPath

if ($LASTEXITCODE -ne 0) {
    throw "protoc generation failed with exit code $LASTEXITCODE"
}

& $ProtocPath `
    -I $ProtoDir `
    --plugin=protoc-gen-ts_proto=$TsPluginPath `
    --ts_proto_out=$TsOutDir `
    --ts_proto_opt=esModuleInterop=true,outputServices=grpc-js `
    $protoPath

if ($LASTEXITCODE -ne 0) {
        throw "ts-proto generation failed with exit code $LASTEXITCODE"
}

Write-Host "[PROTO] generation done."
