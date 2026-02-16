#include <cassert>
#include <thread>
#include <vector>

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

  // New lock API: exclusive conflict + stale fencing token checks.
  {
    vna::service::LockAcquireRequest lockA;
    lockA.selector.type = vna::service::LockResourceType::kPhysicalDevice;
    lockA.selector.resourceId = "dev-lock-0";
    lockA.owner.workspaceId = "ws-a";
    lockA.owner.sessionId = "sess-a";
    lockA.owner.actor = "tester-a";
    lockA.mode = vna::service::LockMode::kExclusive;
    lockA.ttlSeconds = 2;

    vna::service::LockAcquireResult lockAResult;
    assert(service.AcquireLock(lockA, lockAResult) == vna::core::Status::kOk);
    assert(lockAResult.state == vna::service::LockState::kAcquired);
    assert(lockAResult.lease.fencingToken > 0);

    vna::service::LockAcquireRequest lockB = lockA;
    lockB.owner.workspaceId = "ws-b";
    lockB.owner.sessionId = "sess-b";
    lockB.owner.actor = "tester-b";
    vna::service::LockAcquireResult lockBResult;
    assert(service.AcquireLock(lockB, lockBResult) == vna::core::Status::kTimeout);
    assert(lockBResult.code == "LOCK_CONFLICT");
    assert(!lockBResult.conflicts.empty());
    assert(lockBResult.conflicts[0].holderOwner.workspaceId == "ws-a");

    vna::service::LockRenewRequest renewReq;
    renewReq.leaseId = lockAResult.lease.leaseId;
    renewReq.owner = lockA.owner;
    renewReq.fencingToken = lockAResult.lease.fencingToken + 1;
    renewReq.ttlSeconds = 2;
    vna::service::LockOperationResult renewResult;
    assert(service.RenewLock(renewReq, renewResult) == vna::core::Status::kTimeout);
    assert(renewResult.code == "LOCK_STALE");

    vna::service::LockReleaseRequest releaseReq;
    releaseReq.leaseId = lockAResult.lease.leaseId;
    releaseReq.owner = lockA.owner;
    releaseReq.fencingToken = lockAResult.lease.fencingToken;
    vna::service::LockOperationResult releaseResult;
    assert(service.ReleaseLock(releaseReq, releaseResult) == vna::core::Status::kOk);
    assert(releaseResult.state == vna::service::LockState::kReleased);

    std::vector<vna::service::LockLease> snapshot = service.GetLockSnapshot(
        std::vector<vna::service::LockSelector>());
    assert(snapshot.empty());
  }

  return 0;
}
