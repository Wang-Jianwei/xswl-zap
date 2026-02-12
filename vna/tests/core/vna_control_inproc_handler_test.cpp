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

  statusService.UpdateRuntimeMetrics(3, 2);

  vna::service::ServiceStatusResponse response;
  const vna::core::Status status = handler.GetServiceStatus(statusService, response);

  assert(status == vna::core::Status::kOk);
  assert(response.ready);
  assert(response.state == "ready");
  assert(response.message == "inproc");
  assert(response.uptimeMs == 123);
  assert(response.bindAddress == "127.0.0.1");
  assert(response.port == 52000);
  assert(response.tlsEnabled);
  assert(response.logLevel == "warn");
  assert(response.instanceCount == 3);
  assert(response.activeLeaseCount == 2);

  return 0;
}
