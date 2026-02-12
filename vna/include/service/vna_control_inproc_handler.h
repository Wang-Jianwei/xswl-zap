#pragma once

#include <cstdint>

#include "core/status.h"
#include "service/service_status_service.h"

namespace vna {
namespace service {

// In-process contract-aligned response for VnaControl.GetServiceStatus.
struct ServiceStatusResponse {
  bool ready = false;
  std::string state;
  std::string message;
  std::uint64_t uptimeMs = 0;
  std::string bindAddress;
  std::uint32_t port = 0;
  bool tlsEnabled = false;
  std::string logLevel;
  std::uint32_t instanceCount = 0;
  std::uint32_t activeLeaseCount = 0;
};

class VnaControlInProcessHandler {
 public:
  core::Status GetServiceStatus(const ServiceStatusService& statusService,
                                ServiceStatusResponse& out) const;

 private:
  static std::uint32_t SaturateToUInt32(std::size_t value);
};

}  // namespace service
}  // namespace vna
