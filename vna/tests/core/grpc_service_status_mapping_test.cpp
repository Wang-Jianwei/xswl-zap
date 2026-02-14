#include <cassert>

#include <grpcpp/grpcpp.h>

#include "core/built_in_drivers.h"
#include "service/grpc/vna_control_grpc_service.h"

int main() {
  vna::core::RegisterBuiltInDrivers();

  vna::service::VnaControlService controlService;

  vna::core::Topology topology;
  topology.id = "grpc_caps";
  topology.yaml =
      "instances:\n"
      "  - id: inst0\n"
      "    driver: pxi\n"
      "    device: pxi-mock-0\n"
      "    resource: dev0\n";
  assert(controlService.ApplyTopology(topology, "ws-grpc", 2) == vna::core::Status::kOk);

  vna::service::ServiceStatusService statusService;
  vna::service::VnaControlInProcessHandler inprocHandler;

  vna::service::ServiceConfig config;
  config.bindAddress = "127.0.0.1";
  config.port = 53000;
  config.tlsEnabled = false;
  config.logLevel = "info";
  statusService.UpdateConfig(config);

  vna::service::HealthStatus health;
  health.ready = true;
  health.state = "ready";
  health.message = "grpc bootstrap";
  health.uptimeMs = 777;
  statusService.UpdateHealth(health);

  statusService.UpdateBootstrapContext("grpc", "config/service.yaml");
  statusService.UpdateRuntimeMetrics(4, 2);

  vna::service::VnaControlGrpcService grpcService(
      &controlService,
      &statusService,
      &inprocHandler,
      4,
      10);

    vna::InstanceSelector capsRequest;
    capsRequest.set_instance_id("inst0");
    vna::InstanceCapabilities capsResponse;
    grpc::Status capsStatus = grpcService.GetInstanceCapabilities(nullptr, &capsRequest, &capsResponse);
    assert(capsStatus.ok());
    assert(capsResponse.supports_pulse_excitation());
    assert(capsResponse.supports_multi_tone());
    assert(capsResponse.supports_external_clock());
    assert(capsResponse.min_pulse_width_ns() > 0);
    assert(capsResponse.max_sampling_rate_ghz() > 0.0);

    vna::InstanceSelector missingRequest;
    missingRequest.set_instance_id("missing-inst");
    grpc::Status missingStatus = grpcService.GetInstanceCapabilities(nullptr, &missingRequest, &capsResponse);
    assert(!missingStatus.ok());
    assert(missingStatus.error_code() == grpc::StatusCode::INVALID_ARGUMENT);

  vna::Empty request;
  vna::ServiceStatus response;
  grpc::Status rpcStatus = grpcService.GetServiceStatus(nullptr, &request, &response);

  assert(rpcStatus.ok());
  assert(response.ready());
  assert(response.state() == "ready");
  assert(response.message() == "grpc bootstrap | config=config/service.yaml");
  assert(response.bootstrap_mode() == "grpc");
  assert(response.config_path() == "config/service.yaml");
  assert(response.uptime_ms() == 777);
  assert(response.bind_address() == "127.0.0.1");
  assert(response.port() == 53000);
  assert(!response.tls_enabled());
  assert(response.log_level() == "info");
  assert(response.instance_count() == 4);
  assert(response.active_lease_count() == 2);

  return 0;
}
