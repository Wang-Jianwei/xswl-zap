#include "service/service_status_service.h"

namespace vna {
namespace service {

ServiceStatusService::ServiceStatusService() : snapshot_() {}

void ServiceStatusService::UpdateConfig(const ServiceConfig& config) {
  std::lock_guard<std::mutex> lock(mutex_);
  snapshot_.bindAddress = config.bindAddress;
  snapshot_.port = config.port;
  snapshot_.tlsEnabled = config.tlsEnabled;
  snapshot_.logLevel = config.logLevel;
}

void ServiceStatusService::UpdateHealth(const HealthStatus& health) {
  std::lock_guard<std::mutex> lock(mutex_);
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
  snapshot_.bootstrapMode = bootstrapMode;
  snapshot_.configPath = configPath;
}

ServiceStatusSnapshot ServiceStatusService::GetStatus() const {
  std::lock_guard<std::mutex> lock(mutex_);
  return snapshot_;
}

}  // namespace service
}  // namespace vna
