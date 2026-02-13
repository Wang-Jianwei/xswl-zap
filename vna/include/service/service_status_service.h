#pragma once

#include <cstddef>
#include <cstdint>
#include <mutex>
#include <string>

#include "service/process_manager.h"
#include "service/service_config.h"

namespace vna {
namespace service {

struct ServiceStatusSnapshot {
  bool ready = false;
  std::string state = "degraded";
  std::string message = "booting";
  std::string bootstrapMode = "unknown";
  std::string configPath;
  std::uint64_t uptimeMs = 0;

  std::string bindAddress = "0.0.0.0";
  std::uint32_t port = 50051;
  bool tlsEnabled = false;
  std::string logLevel = "info";

  std::size_t instanceCount = 0;
  std::size_t activeLeaseCount = 0;
};

// ServiceStatusService aggregates process/config/runtime snapshots for external callers.
class ServiceStatusService {
 public:
  ServiceStatusService();

  void UpdateConfig(const ServiceConfig& config);
  void UpdateHealth(const HealthStatus& health);
  void UpdateRuntimeMetrics(std::size_t instanceCount, std::size_t activeLeaseCount);
  void UpdateBootstrapContext(const std::string& bootstrapMode, const std::string& configPath);

  ServiceStatusSnapshot GetStatus() const;

 private:
    mutable std::mutex mutex_;
  ServiceStatusSnapshot snapshot_;
};

}  // namespace service
}  // namespace vna
