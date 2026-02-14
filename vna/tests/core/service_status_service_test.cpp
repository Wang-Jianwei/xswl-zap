#include <cassert>
#include <iostream>
#include <sstream>

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

  std::ostringstream capturedLogs;
  std::streambuf* originalBuffer = std::cout.rdbuf(capturedLogs.rdbuf());

  {
    vna::service::ServiceConfig config;
    config.bindAddress = "127.0.0.1";
    config.port = 52000;
    config.tlsEnabled = false;
    config.logLevel = "trace";
    service.UpdateConfig(config);
  }

  {
    vna::service::HealthStatus health;
    health.ready = false;
    health.state = "degraded";
    health.message = "test-transition";
    health.uptimeMs = 100;
    service.UpdateHealth(health);
  }

  service.UpdateBootstrapContext("grpc", "config/final.yaml");
  std::cout.rdbuf(originalBuffer);

  const std::string logs = capturedLogs.str();
  assert(logs.find("[SERVICE_CONFIG_CHANGED]") != std::string::npos);
  assert(logs.find("[SERVICE_HEALTH_CHANGED]") != std::string::npos);
  assert(logs.find("[SERVICE_BOOTSTRAP_CHANGED]") != std::string::npos);

  {
    const vna::service::ServiceStatusSnapshot status = service.GetStatus();
    assert(!status.ready);
    assert(status.state == "degraded");
    assert(status.message == "test-transition");
    assert(status.bootstrapMode == "grpc");
    assert(status.configPath == "config/final.yaml");
    assert(status.uptimeMs == 100);

    assert(status.bindAddress == "127.0.0.1");
    assert(status.port == 52000);
    assert(!status.tlsEnabled);
    assert(status.logLevel == "trace");

    assert(status.instanceCount == 2);
    assert(status.activeLeaseCount == 1);
  }

  return 0;
}
