#include <iostream>
#include <memory>
#include <complex>
#include <string>
#include <vector>

#include <grpcpp/grpcpp.h>

#include "core/built_in_drivers.h"
#include "service/de_embedding_config_parser.h"
#include "service/process_manager.h"
#include "service/service_config.h"
#include "service/service_status_service.h"
#include "service/grpc/grpc_bootstrap_paths.h"
#include "service/vna_control_inproc_handler.h"
#include "service/vna_control_service.h"
#include "service/grpc/vna_control_grpc_service.h"

int main(int argc, char** argv) {
  vna::core::RegisterBuiltInDrivers();

  vna::service::ServiceConfig config;
  std::string selectedConfigPath;
  std::vector<std::string> loadDiagnostics;
  const std::string executablePath = (argc > 0 && argv != nullptr) ? argv[0] : "";
  const std::vector<std::string> configCandidates =
      vna::service::BuildGrpcServerConfigCandidates(executablePath);

  for (std::size_t i = 0; i < configCandidates.size(); ++i) {
    std::vector<std::string> configErrors;
    const vna::core::Status configStatus =
        vna::service::ServiceConfigLoader::LoadFromFile(configCandidates[i], config, configErrors);
    if (configStatus == vna::core::Status::kOk) {
      selectedConfigPath = configCandidates[i];
      break;
    }

    std::string message = configCandidates[i] + " => ";
    if (configErrors.empty()) {
      message += "unknown error";
    } else {
      for (std::size_t j = 0; j < configErrors.size(); ++j) {
        if (j > 0) {
          message += " | ";
        }
        message += configErrors[j];
      }
    }
    loadDiagnostics.push_back(message);
  }

  if (selectedConfigPath.empty()) {
    std::cout << "grpc server config load failed\n";
    for (std::size_t i = 0; i < loadDiagnostics.size(); ++i) {
      std::cout << "  - " << loadDiagnostics[i] << "\n";
    }
    return 1;
  }

  std::cout << "grpc server config loaded: " << selectedConfigPath << "\n";

  if (config.tlsEnabled) {
    std::cout << "grpc server tls_enabled=true is not supported in minimal bootstrap mode\n";
    return 1;
  }

  vna::service::ProcessManager processManager;
  vna::service::ServiceStatusService statusService;
  vna::service::VnaControlService controlService;
  vna::service::VnaControlInProcessHandler inprocHandler;

  if (config.deEmbeddingEnabled) {
    if (!config.deEmbeddingFrequencyProfiles.empty()) {
      std::vector<vna::core::processors::FrequencyPortTransferProfile> profiles;
      std::string parseError;
      if (!vna::service::ParseDeEmbeddingFrequencyProfiles(
              config.deEmbeddingFrequencyProfiles, profiles, parseError)) {
        std::cout << "grpc de-embedding frequency config invalid: " << parseError << "\n";
        return 1;
      }

      if (controlService.SetDeEmbeddingFrequencyPortTransferProfiles(profiles) != vna::core::Status::kOk) {
        std::cout << "grpc de-embedding frequency config rejected\n";
        return 1;
      }
      std::cout << "grpc de-embedding frequency profiles enabled: profile_count=" << profiles.size() << "\n";
    } else {
      std::vector<std::complex<double> > portTransfer;
      std::string parseError;
      if (!vna::service::ParseDeEmbeddingPortTransfer(
              config.deEmbeddingPortTransfer, portTransfer, parseError)) {
        std::cout << "grpc de-embedding config invalid: " << parseError << "\n";
        return 1;
      }

      if (controlService.SetDeEmbeddingPortTransfer(portTransfer) != vna::core::Status::kOk) {
        std::cout << "grpc de-embedding config rejected: invalid port transfer values\n";
        return 1;
      }
      std::cout << "grpc de-embedding enabled: port_count=" << portTransfer.size() << "\n";
    }

    controlService.SetDeEmbeddingEnabled(true);
  }

  vna::core::Topology topology;
  topology.id = "grpc-topology";
  topology.yaml =
      "instances:\n"
      "  - id: inst0\n"
      "    driver: pxi\n"
      "    device: pxi-mock-0\n"
      "    resource: dev0\n";

  if (controlService.ApplyTopology(topology, "ws-grpc", 2) != vna::core::Status::kOk) {
    processManager.SetDegraded("grpc bootstrap topology failed");
    std::cout << "grpc server topology bootstrap failed\n";
    return 1;
  }

  if (controlService.Start() != vna::core::Status::kOk) {
    processManager.SetDegraded("grpc bootstrap start failed");
    std::cout << "grpc server runtime start failed\n";
    return 1;
  }

  processManager.SetReady("grpc bootstrap");
  statusService.UpdateConfig(config);
  statusService.UpdateBootstrapContext("grpc", selectedConfigPath);
  statusService.UpdateHealth(processManager.GetHealth());
  statusService.UpdateRuntimeMetrics(controlService.InstanceCount(), controlService.ActiveLeaseCount());

  vna::service::VnaControlGrpcService grpcService(
      &controlService,
      &statusService,
      &inprocHandler,
      config.streamThrottleEveryNFrames,
      config.streamThrottleMs);

  std::vector<std::string> addresses;
  addresses.push_back(config.bindAddress + ":" + std::to_string(config.port));
  if (config.bindAddress == "0.0.0.0") {
    addresses.push_back("127.0.0.1:" + std::to_string(config.port));
  }

  for (std::size_t i = 0; i < addresses.size(); ++i) {
    grpc::ServerBuilder builder;
    builder.AddListeningPort(addresses[i], grpc::InsecureServerCredentials());
    builder.RegisterService(&grpcService);

    std::unique_ptr<grpc::Server> server(builder.BuildAndStart());
    if (!server) {
      std::cout << "grpc server start failed: " << addresses[i] << "\n";
      continue;
    }

    std::cout << "grpc server listening: " << addresses[i] << "\n";
    server->Wait();
    return 0;
  }

  std::cout << "grpc server failed to start on all candidate addresses\n";
  return 1;
}
