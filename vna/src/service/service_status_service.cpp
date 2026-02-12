#include "service/service_status_service.h"

namespace vna {
namespace service {

ServiceStatusService::ServiceStatusService() : snapshot_() {}

void ServiceStatusService::UpdateConfig(const ServiceConfig& config) {
  snapshot_.bindAddress = config.bindAddress;
  snapshot_.port = config.port;
  snapshot_.tlsEnabled = config.tlsEnabled;
  snapshot_.logLevel = config.logLevel;
}

void ServiceStatusService::UpdateHealth(const HealthStatus& health) {
  snapshot_.ready = health.ready;
  snapshot_.state = health.state;
  snapshot_.message = health.message;
  snapshot_.uptimeMs = health.uptimeMs;
}

void ServiceStatusService::UpdateRuntimeMetrics(std::size_t instanceCount,
                                                std::size_t activeLeaseCount) {
  snapshot_.instanceCount = instanceCount;
  snapshot_.activeLeaseCount = activeLeaseCount;
}

ServiceStatusSnapshot ServiceStatusService::GetStatus() const {
  return snapshot_;
}

}  // namespace service
}  // namespace vna
