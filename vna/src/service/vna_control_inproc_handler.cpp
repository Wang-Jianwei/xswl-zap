#include "service/vna_control_inproc_handler.h"

#include <limits>

namespace vna {
namespace service {

core::Status VnaControlInProcessHandler::GetServiceStatus(const ServiceStatusService& statusService,
                                                          ServiceStatusResponse& out) const {
  const ServiceStatusSnapshot snapshot = statusService.GetStatus();

  out.ready = snapshot.ready;
  out.state = snapshot.state;
  out.message = snapshot.message;
  out.uptimeMs = snapshot.uptimeMs;
  out.bindAddress = snapshot.bindAddress;
  out.port = snapshot.port;
  out.tlsEnabled = snapshot.tlsEnabled;
  out.logLevel = snapshot.logLevel;
  out.instanceCount = SaturateToUInt32(snapshot.instanceCount);
  out.activeLeaseCount = SaturateToUInt32(snapshot.activeLeaseCount);

  return core::Status::kOk;
}

std::uint32_t VnaControlInProcessHandler::SaturateToUInt32(std::size_t value) {
  const std::size_t maxValue = static_cast<std::size_t>(std::numeric_limits<std::uint32_t>::max());
  if (value > maxValue) {
    return std::numeric_limits<std::uint32_t>::max();
  }
  return static_cast<std::uint32_t>(value);
}

}  // namespace service
}  // namespace vna
