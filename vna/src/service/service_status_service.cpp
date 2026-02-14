#include "service/service_status_service.h"

#include <iostream>

namespace vna {
namespace service {

ServiceStatusService::ServiceStatusService() : snapshot_() {}

void ServiceStatusService::UpdateConfig(const ServiceConfig& config) {
  std::lock_guard<std::mutex> lock(mutex_);
  if (snapshot_.bindAddress != config.bindAddress ||
      snapshot_.port != config.port ||
      snapshot_.tlsEnabled != config.tlsEnabled ||
      snapshot_.logLevel != config.logLevel) {
    std::cout << "[SERVICE_CONFIG_CHANGED] bind_address=" << snapshot_.bindAddress
              << "->" << config.bindAddress
              << ", port=" << snapshot_.port << "->" << config.port
              << ", tls_enabled=" << (snapshot_.tlsEnabled ? "true" : "false")
              << "->" << (config.tlsEnabled ? "true" : "false")
              << ", log_level=" << snapshot_.logLevel << "->" << config.logLevel
              << "\n";
  }
  snapshot_.bindAddress = config.bindAddress;
  snapshot_.port = config.port;
  snapshot_.tlsEnabled = config.tlsEnabled;
  snapshot_.logLevel = config.logLevel;
}

void ServiceStatusService::UpdateHealth(const HealthStatus& health) {
  std::lock_guard<std::mutex> lock(mutex_);
  if (snapshot_.ready != health.ready ||
      snapshot_.state != health.state ||
      snapshot_.message != health.message) {
    std::cout << "[SERVICE_HEALTH_CHANGED] ready=" << (snapshot_.ready ? "true" : "false")
              << "->" << (health.ready ? "true" : "false")
              << ", state=" << snapshot_.state << "->" << health.state
              << ", message=" << snapshot_.message << "->" << health.message
              << "\n";
  }
  snapshot_.ready = health.ready;
  snapshot_.state = health.state;
  snapshot_.message = health.message;
  snapshot_.uptimeMs = health.uptimeMs;
}

void ServiceStatusService::UpdateRuntimeMetrics(std::size_t instanceCount,
                                                std::size_t activeLeaseCount) {
  std::lock_guard<std::mutex> lock(mutex_);
  snapshot_.instanceCount = instanceCount;
  snapshot_.activeLeaseCount = activeLeaseCount;
}

void ServiceStatusService::UpdateBootstrapContext(const std::string& bootstrapMode,
                                                  const std::string& configPath) {
  std::lock_guard<std::mutex> lock(mutex_);
  if (snapshot_.bootstrapMode != bootstrapMode || snapshot_.configPath != configPath) {
    std::cout << "[SERVICE_BOOTSTRAP_CHANGED] mode=" << snapshot_.bootstrapMode
              << "->" << bootstrapMode
              << ", config_path=" << snapshot_.configPath << "->" << configPath
              << "\n";
  }
  snapshot_.bootstrapMode = bootstrapMode;
  snapshot_.configPath = configPath;
}

ServiceStatusSnapshot ServiceStatusService::GetStatus() const {
  std::lock_guard<std::mutex> lock(mutex_);
  return snapshot_;
}

}  // namespace service
}  // namespace vna
