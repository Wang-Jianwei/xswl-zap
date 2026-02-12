#pragma once

#include <cstdint>
#include <map>
#include <string>

#include "core/resource_types.h"
#include "core/status.h"

namespace vna {
namespace core {

class ResourceManager {
 public:
  ResourceManager();

  // Acquire a lease for a resource.
  Status Acquire(const ResourceRequest& request, std::uint32_t ttlSeconds, LeaseInfo& outLease);

  // Renew lease TTL.
  Status Renew(const std::string& leaseId, std::uint32_t ttlSeconds);

  // Release a lease.
  Status Release(const std::string& leaseId);

  // Purge expired leases based on monotonic time.
  void PurgeExpired();

  // For tests/diagnostics.
  std::size_t ActiveLeaseCount() const;

 private:
  struct LeaseEntry {
    LeaseInfo info;
    std::uint64_t expiresAtNs = 0;
  };

  static std::uint64_t NowNs();
  static std::string GenerateLeaseId(const std::string& resourceId, std::uint64_t nowNs);

  std::map<std::string, LeaseEntry> leasesById_;
  std::map<std::string, std::string> leaseIdByResourceId_;
};

}  // namespace core
}  // namespace vna
