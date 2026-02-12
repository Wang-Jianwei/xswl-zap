#include <cassert>
#include <thread>

#include "core/resource_manager.h"

int main() {
  vna::core::ResourceManager manager;

  vna::core::ResourceRequest request;
  request.resourceId = "dev0";
  request.workspaceId = "ws0";
  request.exclusive = true;
  request.timeoutMs = 10;

  vna::core::LeaseInfo lease;
  assert(manager.Acquire(request, 1, lease) == vna::core::Status::kOk);
  assert(!lease.leaseId.empty());
  assert(manager.ActiveLeaseCount() == 1);

  // Contention should fail (simplified behavior).
  vna::core::LeaseInfo lease2;
  assert(manager.Acquire(request, 1, lease2) != vna::core::Status::kOk);

  // Renew should succeed.
  assert(manager.Renew(lease.leaseId, 1) == vna::core::Status::kOk);

  // Release should succeed.
  assert(manager.Release(lease.leaseId) == vna::core::Status::kOk);
  assert(manager.ActiveLeaseCount() == 0);

  // TTL purge path.
  vna::core::LeaseInfo lease3;
  assert(manager.Acquire(request, 1, lease3) == vna::core::Status::kOk);
  std::this_thread::sleep_for(std::chrono::milliseconds(1100));
  manager.PurgeExpired();
  assert(manager.ActiveLeaseCount() == 0);

  return 0;
}
