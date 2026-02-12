#pragma once

#include <cstdint>
#include <string>

#include "core/resource_manager.h"
#include "core/resource_types.h"
#include "core/status.h"

namespace vna {
namespace service {

// ResourceBrokerService is a minimal in-process facade over ResourceManager.
// It is intended to be wrapped by transport layer APIs later.
class ResourceBrokerService {
 public:
  ResourceBrokerService();

  core::Status Acquire(const core::ResourceRequest& request,
                       std::uint32_t ttlSeconds,
                       core::LeaseInfo& outLease);

  core::Status Renew(const core::LeaseInfo& lease,
                     std::uint32_t ttlSeconds);

  core::Status Release(const core::LeaseInfo& lease);

  std::size_t ActiveLeaseCount() const;

 private:
  core::ResourceManager manager_;
};

}  // namespace service
}  // namespace vna
