#pragma once

#include <cstdint>
#include <string>

namespace vna {
namespace core {

struct InstanceConfig {
  std::string instanceId;
  std::string workspaceId;

  // Which driver to create (e.g. "pxi", "usb").
  std::string driverType;
  std::string deviceIdentifier;

  // Resource lease scope.
  std::string resourceId;
  std::uint32_t leaseTtlSeconds = 5;
};

}  // namespace core
}  // namespace vna
