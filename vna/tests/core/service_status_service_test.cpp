#include <cassert>

#include "service/service_status_service.h"

int main() {
  vna::service::ServiceStatusService service;

  {
    const vna::service::ServiceStatusSnapshot status = service.GetStatus();
    assert(!status.ready);
    assert(status.state == "degraded");
    assert(status.bootstrapMode == "unknown");
    assert(status.configPath.empty());
    assert(status.bindAddress == "0.0.0.0");
    assert(status.port == 50051);
    assert(status.instanceCount == 0);
    assert(status.activeLeaseCount == 0);
  }

  service.UpdateBootstrapContext("grpc", "config/service.yaml");
  service.UpdateBootstrapContext("grpc", "config/override.yaml");

  {
    vna::service::ServiceConfig config;
    config.bindAddress = "127.0.0.1";
    config.port = 51000;
    config.tlsEnabled = true;
    config.logLevel = "debug";
    service.UpdateConfig(config);
  }

  {
    vna::service::HealthStatus health;
    health.ready = true;
    health.state = "ready";
    health.message = "running";
    health.uptimeMs = 42;
    service.UpdateHealth(health);
  }

  service.UpdateRuntimeMetrics(2, 1);

  {
    const vna::service::ServiceStatusSnapshot status = service.GetStatus();
    assert(status.ready);
    assert(status.state == "ready");
    assert(status.message == "running");
    assert(status.bootstrapMode == "grpc");
    assert(status.configPath == "config/override.yaml");
    assert(status.uptimeMs == 42);

    assert(status.bindAddress == "127.0.0.1");
    assert(status.port == 51000);
    assert(status.tlsEnabled);
    assert(status.logLevel == "debug");

    assert(status.instanceCount == 2);
    assert(status.activeLeaseCount == 1);
  }

  return 0;
}
