#include <cassert>

#include "service/service_status_service.h"
#include "service/vna_control_inproc_handler.h"

int main() {
  vna::service::ServiceStatusService statusService;
  vna::service::VnaControlInProcessHandler handler;

  vna::service::ServiceConfig config;
  config.bindAddress = "127.0.0.1";
  config.port = 52000;
  config.tlsEnabled = true;
  config.logLevel = "warn";
  statusService.UpdateConfig(config);

  vna::service::HealthStatus health;
  health.ready = true;
  health.state = "ready";
  health.message = "inproc";
  health.uptimeMs = 123;
  statusService.UpdateHealth(health);

  statusService.UpdateBootstrapContext("grpc", "config/service.yaml");

  statusService.UpdateRuntimeMetrics(3, 2);

  vna::service::ServiceStatusResponse response;
  const vna::core::Status status = handler.GetServiceStatus(statusService, response);

  assert(status == vna::core::Status::kOk);
  assert(response.ready);
  assert(response.state == "ready");
  assert(response.message == "inproc | config=config/service.yaml");
  assert(response.bootstrapMode == "grpc");
  assert(response.configPath == "config/service.yaml");
  assert(response.uptimeMs == 123);
  assert(response.bindAddress == "127.0.0.1");
  assert(response.port == 52000);
  assert(response.tlsEnabled);
  assert(response.logLevel == "warn");
  assert(response.instanceCount == 3);
  assert(response.activeLeaseCount == 2);

  {
    vna::service::HealthStatus legacyHealth;
    legacyHealth.ready = true;
    legacyHealth.state = "ready";
    legacyHealth.message = "legacy-ready | config=old/path.yaml";
    legacyHealth.uptimeMs = 456;
    statusService.UpdateHealth(legacyHealth);
    statusService.UpdateBootstrapContext("grpc", "config/new-path.yaml");

    vna::service::ServiceStatusResponse legacyResponse;
    const vna::core::Status legacyStatus = handler.GetServiceStatus(statusService, legacyResponse);
    assert(legacyStatus == vna::core::Status::kOk);
    assert(legacyResponse.message == "legacy-ready | config=config/new-path.yaml");
    assert(legacyResponse.configPath == "config/new-path.yaml");
    assert(legacyResponse.bootstrapMode == "grpc");
  }

  {
    statusService.UpdateBootstrapContext("grpc", "");

    vna::service::ServiceStatusResponse noConfigResponse;
    const vna::core::Status noConfigStatus = handler.GetServiceStatus(statusService, noConfigResponse);
    assert(noConfigStatus == vna::core::Status::kOk);
    assert(noConfigResponse.message == "legacy-ready");
    assert(noConfigResponse.configPath.empty());
    assert(noConfigResponse.bootstrapMode == "grpc");
  }

  return 0;
}
