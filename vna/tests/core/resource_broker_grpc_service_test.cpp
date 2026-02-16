#include <cassert>

#include <grpcpp/grpcpp.h>

#include "service/grpc/resource_broker_grpc_service.h"

int main() {
  vna::service::ResourceBrokerService brokerService;
  vna::service::ResourceBrokerGrpcService grpcService(&brokerService);

  vna::LockAcquireRequest lockA;
  lockA.mutable_selector()->set_type(vna::LockResourceType::LOCK_RESOURCE_TYPE_PHYSICAL_DEVICE);
  lockA.mutable_selector()->set_resource_id("dev-rb-0");
  lockA.mutable_owner()->set_workspace_id("ws-a");
  lockA.mutable_owner()->set_session_id("sess-a");
  lockA.mutable_owner()->set_actor("grpc-test-a");
  lockA.set_mode(vna::LockMode::LOCK_MODE_EXCLUSIVE);
  lockA.set_ttl_seconds(60);

  vna::LockAcquireResult lockAResult;
  grpc::Status acquireStatusA = grpcService.AcquireLock(nullptr, &lockA, &lockAResult);
  assert(acquireStatusA.ok());
  assert(lockAResult.ok());
  assert(lockAResult.code() == "OK");
  assert(!lockAResult.lease().lease_id().empty());
  assert(lockAResult.lease().fencing_token() > 0);

  vna::LockAcquireRequest lockB = lockA;
  lockB.mutable_owner()->set_workspace_id("ws-b");
  lockB.mutable_owner()->set_session_id("sess-b");
  lockB.mutable_owner()->set_actor("grpc-test-b");

  vna::LockAcquireResult lockBResult;
  grpc::Status acquireStatusB = grpcService.AcquireLock(nullptr, &lockB, &lockBResult);
  assert(acquireStatusB.ok());
  assert(!lockBResult.ok());
  assert(lockBResult.code() == "LOCK_CONFLICT");
  assert(lockBResult.conflicts_size() > 0);
  assert(lockBResult.conflicts(0).selector().resource_id() == "dev-rb-0");

  vna::LockSnapshotRequest snapshotRequest;
  snapshotRequest.add_selectors()->set_type(vna::LockResourceType::LOCK_RESOURCE_TYPE_PHYSICAL_DEVICE);
  snapshotRequest.mutable_selectors(0)->set_resource_id("dev-rb-0");
  vna::LockSnapshot snapshot;
  grpc::Status snapshotStatus = grpcService.GetLockSnapshot(nullptr, &snapshotRequest, &snapshot);
  assert(snapshotStatus.ok());
  assert(snapshot.leases_size() == 1);
  assert(snapshot.leases(0).owner().workspace_id() == "ws-a");

  vna::LockReleaseRequest releaseRequest;
  releaseRequest.set_lease_id(lockAResult.lease().lease_id());
  *releaseRequest.mutable_owner() = lockA.owner();
  releaseRequest.set_fencing_token(lockAResult.lease().fencing_token());

  vna::LockOperationResult releaseResult;
  grpc::Status releaseStatus = grpcService.ReleaseLock(nullptr, &releaseRequest, &releaseResult);
  assert(releaseStatus.ok());
  assert(releaseResult.ok());
  assert(releaseResult.code() == "OK");

  vna::LockSnapshot snapshotAfterRelease;
  grpc::Status snapshotAfterReleaseStatus =
      grpcService.GetLockSnapshot(nullptr, &snapshotRequest, &snapshotAfterRelease);
  assert(snapshotAfterReleaseStatus.ok());
  assert(snapshotAfterRelease.leases_size() == 0);

  return 0;
}
