#include <iostream>
#include <memory>
#include <string>
#include <vector>

#include <grpcpp/grpcpp.h>

#include "core/built_in_drivers.h"
#include "service/process_manager.h"
#include "service/service_config.h"
#include "service/service_status_service.h"
#include "service/vna_control_inproc_handler.h"
#include "service/vna_control_service.h"
#include "service/grpc/vna_control_grpc_service.h"

int main() {
  vna::core::RegisterBuiltInDrivers();

  vna::service::ServiceConfig config;
  std::vector<std::string> configErrors;
  const vna::core::Status configStatus =
      vna::service::ServiceConfigLoader::LoadFromFile("config/service.yaml", config, configErrors);

  if (configStatus != vna::core::Status::kOk) {
    std::cout << "grpc server config load failed\n";
    for (std::size_t i = 0; i < configErrors.size(); ++i) {
      std::cout << "  - " << configErrors[i] << "\n";
    }
    return 1;
  }

  if (config.tlsEnabled) {
    std::cout << "grpc server tls_enabled=true is not supported in minimal bootstrap mode\n";
    return 1;
  }

  vna::service::ProcessManager processManager;
  vna::service::ServiceStatusService statusService;
  vna::service::VnaControlService controlService;
  vna::service::VnaControlInProcessHandler inprocHandler;

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
  statusService.UpdateHealth(processManager.GetHealth());
  statusService.UpdateRuntimeMetrics(controlService.InstanceCount(), controlService.ActiveLeaseCount());

  vna::service::VnaControlGrpcService grpcService(&controlService, &statusService, &inprocHandler);

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
