#pragma once

#include <cstdint>
#include <string>

namespace vna {
namespace core {

struct ResourceRequest {
  std::string resourceId;
  std::string workspaceId;
  bool exclusive = true;
  std::uint32_t timeoutMs = 0;
};

struct LeaseInfo {
  std::string leaseId;
  std::string resourceId;
  std::string workspaceId;
  std::uint32_t ttlSeconds = 0;
};

}  // namespace core
}  // namespace vna
