#include <cassert>

#include <grpcpp/grpcpp.h>

#include "service/grpc/vna_control_grpc_service.h"

int main() {
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
      nullptr,
      &statusService,
      &inprocHandler,
      4,
      10);

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
