#include <cassert>
#include <thread>

#include "service/resource_broker_service.h"

int main() {
  vna::service::ResourceBrokerService service;

  vna::core::ResourceRequest request;
  request.resourceId = "dev0";
  request.workspaceId = "ws0";
  request.exclusive = true;
  request.timeoutMs = 10;

  vna::core::LeaseInfo lease;
  assert(service.Acquire(request, 1, lease) == vna::core::Status::kOk);
  assert(!lease.leaseId.empty());
  assert(service.ActiveLeaseCount() == 1);

  vna::core::LeaseInfo lease2;
  assert(service.Acquire(request, 1, lease2) == vna::core::Status::kTimeout);

  assert(service.Renew(lease, 1) == vna::core::Status::kOk);

  assert(service.Release(lease) == vna::core::Status::kOk);
  assert(service.ActiveLeaseCount() == 0);

  vna::core::LeaseInfo lease3;
  assert(service.Acquire(request, 1, lease3) == vna::core::Status::kOk);
  std::this_thread::sleep_for(std::chrono::milliseconds(1100));

  vna::core::LeaseInfo staleLease;
  staleLease.leaseId = lease3.leaseId;
  assert(service.Renew(staleLease, 1) == vna::core::Status::kTimeout);
  assert(service.ActiveLeaseCount() == 0);

  return 0;
}
