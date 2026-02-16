#include "service/grpc/resource_broker_grpc_service.h"

namespace {

::grpc::Status ToGrpcStatus(::vna::core::Status status, const std::string& message) {
  switch (status) {
    case ::vna::core::Status::kOk:
      return ::grpc::Status::OK;
    case ::vna::core::Status::kInvalidArgument:
      return ::grpc::Status(::grpc::StatusCode::INVALID_ARGUMENT, message);
    case ::vna::core::Status::kTimeout:
      return ::grpc::Status(::grpc::StatusCode::DEADLINE_EXCEEDED, message);
    case ::vna::core::Status::kUnsupported:
      return ::grpc::Status(::grpc::StatusCode::UNIMPLEMENTED, message);
    case ::vna::core::Status::kCanceled:
      return ::grpc::Status(::grpc::StatusCode::CANCELLED, message);
    case ::vna::core::Status::kInternalError:
      return ::grpc::Status(::grpc::StatusCode::INTERNAL, message);
  }
  return ::grpc::Status(::grpc::StatusCode::INTERNAL, message);
}

::vna::service::LockResourceType ToServiceLockResourceType(::vna::LockResourceType type) {
  switch (type) {
    case ::vna::LockResourceType::LOCK_RESOURCE_TYPE_PHYSICAL_DEVICE:
      return ::vna::service::LockResourceType::kPhysicalDevice;
    case ::vna::LockResourceType::LOCK_RESOURCE_TYPE_MOCK_DEVICE:
      return ::vna::service::LockResourceType::kMockDevice;
    case ::vna::LockResourceType::LOCK_RESOURCE_TYPE_VIRTUAL_VNA:
      return ::vna::service::LockResourceType::kVirtualVna;
    case ::vna::LockResourceType::LOCK_RESOURCE_TYPE_TRIGGER_LINE:
      return ::vna::service::LockResourceType::kTriggerLine;
    case ::vna::LockResourceType::LOCK_RESOURCE_TYPE_CLOCK_DOMAIN:
      return ::vna::service::LockResourceType::kClockDomain;
    case ::vna::LockResourceType::LOCK_RESOURCE_TYPE_WORKSPACE_SESSION:
      return ::vna::service::LockResourceType::kWorkspaceSession;
    case ::vna::LockResourceType::LOCK_RESOURCE_TYPE_UNSPECIFIED:
      return ::vna::service::LockResourceType::kUnspecified;
  }
  return ::vna::service::LockResourceType::kUnspecified;
}

::vna::LockResourceType ToProtoLockResourceType(::vna::service::LockResourceType type) {
  switch (type) {
    case ::vna::service::LockResourceType::kPhysicalDevice:
      return ::vna::LockResourceType::LOCK_RESOURCE_TYPE_PHYSICAL_DEVICE;
    case ::vna::service::LockResourceType::kMockDevice:
      return ::vna::LockResourceType::LOCK_RESOURCE_TYPE_MOCK_DEVICE;
    case ::vna::service::LockResourceType::kVirtualVna:
      return ::vna::LockResourceType::LOCK_RESOURCE_TYPE_VIRTUAL_VNA;
    case ::vna::service::LockResourceType::kTriggerLine:
      return ::vna::LockResourceType::LOCK_RESOURCE_TYPE_TRIGGER_LINE;
    case ::vna::service::LockResourceType::kClockDomain:
      return ::vna::LockResourceType::LOCK_RESOURCE_TYPE_CLOCK_DOMAIN;
    case ::vna::service::LockResourceType::kWorkspaceSession:
      return ::vna::LockResourceType::LOCK_RESOURCE_TYPE_WORKSPACE_SESSION;
    case ::vna::service::LockResourceType::kUnspecified:
      return ::vna::LockResourceType::LOCK_RESOURCE_TYPE_UNSPECIFIED;
  }
  return ::vna::LockResourceType::LOCK_RESOURCE_TYPE_UNSPECIFIED;
}

::vna::service::LockMode ToServiceLockMode(::vna::LockMode mode) {
  switch (mode) {
    case ::vna::LockMode::LOCK_MODE_SHARED:
      return ::vna::service::LockMode::kShared;
    case ::vna::LockMode::LOCK_MODE_EXCLUSIVE:
      return ::vna::service::LockMode::kExclusive;
    case ::vna::LockMode::LOCK_MODE_UNSPECIFIED:
      return ::vna::service::LockMode::kUnspecified;
  }
  return ::vna::service::LockMode::kUnspecified;
}

::vna::LockMode ToProtoLockMode(::vna::service::LockMode mode) {
  switch (mode) {
    case ::vna::service::LockMode::kShared:
      return ::vna::LockMode::LOCK_MODE_SHARED;
    case ::vna::service::LockMode::kExclusive:
      return ::vna::LockMode::LOCK_MODE_EXCLUSIVE;
    case ::vna::service::LockMode::kUnspecified:
      return ::vna::LockMode::LOCK_MODE_UNSPECIFIED;
  }
  return ::vna::LockMode::LOCK_MODE_UNSPECIFIED;
}

::vna::LockState ToProtoLockState(::vna::service::LockState state) {
  switch (state) {
    case ::vna::service::LockState::kAcquired:
      return ::vna::LockState::LOCK_STATE_ACQUIRED;
    case ::vna::service::LockState::kRefreshed:
      return ::vna::LockState::LOCK_STATE_REFRESHED;
    case ::vna::service::LockState::kReleased:
      return ::vna::LockState::LOCK_STATE_RELEASED;
    case ::vna::service::LockState::kConflict:
      return ::vna::LockState::LOCK_STATE_CONFLICT;
    case ::vna::service::LockState::kStale:
      return ::vna::LockState::LOCK_STATE_STALE;
    case ::vna::service::LockState::kExpired:
      return ::vna::LockState::LOCK_STATE_EXPIRED;
    case ::vna::service::LockState::kUnspecified:
      return ::vna::LockState::LOCK_STATE_UNSPECIFIED;
  }
  return ::vna::LockState::LOCK_STATE_UNSPECIFIED;
}

void FillProtoLease(const ::vna::service::LockLease& in, ::vna::LockLease* out) {
  out->set_lease_id(in.leaseId);
  out->mutable_selector()->set_type(ToProtoLockResourceType(in.selector.type));
  out->mutable_selector()->set_resource_id(in.selector.resourceId);
  out->mutable_owner()->set_workspace_id(in.owner.workspaceId);
  out->mutable_owner()->set_instance_id(in.owner.instanceId);
  out->mutable_owner()->set_session_id(in.owner.sessionId);
  out->mutable_owner()->set_actor(in.owner.actor);
  out->set_mode(ToProtoLockMode(in.mode));
  out->set_fencing_token(in.fencingToken);
  out->set_acquired_at_ms(in.acquiredAtMs);
  out->set_expire_at_ms(in.expireAtMs);
}

void FillProtoConflict(const ::vna::service::LockConflictDetail& in, ::vna::LockConflictDetail* out) {
  out->mutable_selector()->set_type(ToProtoLockResourceType(in.selector.type));
  out->mutable_selector()->set_resource_id(in.selector.resourceId);
  out->set_holder_lease_id(in.holderLeaseId);
  out->mutable_holder_owner()->set_workspace_id(in.holderOwner.workspaceId);
  out->mutable_holder_owner()->set_instance_id(in.holderOwner.instanceId);
  out->mutable_holder_owner()->set_session_id(in.holderOwner.sessionId);
  out->mutable_holder_owner()->set_actor(in.holderOwner.actor);
  out->set_holder_fencing_token(in.holderFencingToken);
  out->set_holder_expire_at_ms(in.holderExpireAtMs);
  out->set_suggestion(in.suggestion);
}

}  // namespace

namespace vna {
namespace service {

ResourceBrokerGrpcService::ResourceBrokerGrpcService(ResourceBrokerService* brokerService)
    : brokerService_(brokerService) {}

::grpc::Status ResourceBrokerGrpcService::AcquireLock(::grpc::ServerContext* /*context*/,
                                                      const ::vna::LockAcquireRequest* request,
                                                      ::vna::LockAcquireResult* response) {
  if (brokerService_ == nullptr || request == nullptr || response == nullptr) {
    return ::grpc::Status(::grpc::StatusCode::INVALID_ARGUMENT, "invalid arguments");
  }

  ::vna::service::LockAcquireRequest in;
  in.selector.type = ToServiceLockResourceType(request->selector().type());
  in.selector.resourceId = request->selector().resource_id();
  in.owner.workspaceId = request->owner().workspace_id();
  in.owner.instanceId = request->owner().instance_id();
  in.owner.sessionId = request->owner().session_id();
  in.owner.actor = request->owner().actor();
  in.mode = ToServiceLockMode(request->mode());
  in.ttlSeconds = request->ttl_seconds();
  in.waitTimeoutMs = request->wait_timeout_ms();
  in.expectedMinFencingToken = request->expected_min_fencing_token();

  ::vna::service::LockAcquireResult out;
  const ::vna::core::Status status = brokerService_->AcquireLock(in, out);

  response->set_ok(status == ::vna::core::Status::kOk);
  response->set_code(out.code);
  response->set_message(out.message);
  response->set_state(ToProtoLockState(out.state));
  FillProtoLease(out.lease, response->mutable_lease());
  for (std::size_t i = 0; i < out.conflicts.size(); ++i) {
    FillProtoConflict(out.conflicts[i], response->add_conflicts());
  }
  return ::grpc::Status::OK;
}

::grpc::Status ResourceBrokerGrpcService::RenewLock(::grpc::ServerContext* /*context*/,
                                                    const ::vna::LockRenewRequest* request,
                                                    ::vna::LockOperationResult* response) {
  if (brokerService_ == nullptr || request == nullptr || response == nullptr) {
    return ::grpc::Status(::grpc::StatusCode::INVALID_ARGUMENT, "invalid arguments");
  }

  ::vna::service::LockRenewRequest in;
  in.leaseId = request->lease_id();
  in.owner.workspaceId = request->owner().workspace_id();
  in.owner.instanceId = request->owner().instance_id();
  in.owner.sessionId = request->owner().session_id();
  in.owner.actor = request->owner().actor();
  in.fencingToken = request->fencing_token();
  in.ttlSeconds = request->ttl_seconds();

  ::vna::service::LockOperationResult out;
  const ::vna::core::Status status = brokerService_->RenewLock(in, out);

  response->set_ok(status == ::vna::core::Status::kOk);
  response->set_code(out.code);
  response->set_message(out.message);
  response->set_state(ToProtoLockState(out.state));
  FillProtoLease(out.lease, response->mutable_lease());
  for (std::size_t i = 0; i < out.conflicts.size(); ++i) {
    FillProtoConflict(out.conflicts[i], response->add_conflicts());
  }
  return ::grpc::Status::OK;
}

::grpc::Status ResourceBrokerGrpcService::ReleaseLock(::grpc::ServerContext* /*context*/,
                                                      const ::vna::LockReleaseRequest* request,
                                                      ::vna::LockOperationResult* response) {
  if (brokerService_ == nullptr || request == nullptr || response == nullptr) {
    return ::grpc::Status(::grpc::StatusCode::INVALID_ARGUMENT, "invalid arguments");
  }

  ::vna::service::LockReleaseRequest in;
  in.leaseId = request->lease_id();
  in.owner.workspaceId = request->owner().workspace_id();
  in.owner.instanceId = request->owner().instance_id();
  in.owner.sessionId = request->owner().session_id();
  in.owner.actor = request->owner().actor();
  in.fencingToken = request->fencing_token();

  ::vna::service::LockOperationResult out;
  const ::vna::core::Status status = brokerService_->ReleaseLock(in, out);

  response->set_ok(status == ::vna::core::Status::kOk);
  response->set_code(out.code);
  response->set_message(out.message);
  response->set_state(ToProtoLockState(out.state));
  FillProtoLease(out.lease, response->mutable_lease());
  for (std::size_t i = 0; i < out.conflicts.size(); ++i) {
    FillProtoConflict(out.conflicts[i], response->add_conflicts());
  }
  return ::grpc::Status::OK;
}

::grpc::Status ResourceBrokerGrpcService::GetLockSnapshot(::grpc::ServerContext* /*context*/,
                                                          const ::vna::LockSnapshotRequest* request,
                                                          ::vna::LockSnapshot* response) {
  if (brokerService_ == nullptr || request == nullptr || response == nullptr) {
    return ::grpc::Status(::grpc::StatusCode::INVALID_ARGUMENT, "invalid arguments");
  }

  std::vector<::vna::service::LockSelector> selectors;
  selectors.reserve(static_cast<std::size_t>(request->selectors_size()));
  for (int i = 0; i < request->selectors_size(); ++i) {
    ::vna::service::LockSelector selector;
    selector.type = ToServiceLockResourceType(request->selectors(i).type());
    selector.resourceId = request->selectors(i).resource_id();
    selectors.push_back(selector);
  }

  const std::vector<::vna::service::LockLease> snapshot = brokerService_->GetLockSnapshot(selectors);
  for (std::size_t i = 0; i < snapshot.size(); ++i) {
    FillProtoLease(snapshot[i], response->add_leases());
  }
  return ::grpc::Status::OK;
}

::grpc::Status ResourceBrokerGrpcService::Acquire(::grpc::ServerContext* /*context*/,
                                                  const ::vna::ResourceRequest* request,
                                                  ::vna::LeaseInfo* response) {
  if (brokerService_ == nullptr || request == nullptr || response == nullptr) {
    return ::grpc::Status(::grpc::StatusCode::INVALID_ARGUMENT, "invalid arguments");
  }

  ::vna::core::ResourceRequest in;
  in.resourceId = request->resource_id();
  in.workspaceId = request->workspace_id();
  in.exclusive = request->exclusive();
  in.timeoutMs = request->timeout_ms();

  ::vna::core::LeaseInfo lease;
  const ::vna::core::Status status = brokerService_->Acquire(in, 30, lease);
  if (status != ::vna::core::Status::kOk) {
    return ToGrpcStatus(status, "acquire failed");
  }

  response->set_lease_id(lease.leaseId);
  response->set_resource_id(lease.resourceId);
  response->set_ttl_seconds(lease.ttlSeconds);
  return ::grpc::Status::OK;
}

::grpc::Status ResourceBrokerGrpcService::Renew(::grpc::ServerContext* /*context*/,
                                                const ::vna::LeaseInfo* request,
                                                ::vna::ValidationResult* response) {
  if (brokerService_ == nullptr || request == nullptr || response == nullptr) {
    return ::grpc::Status(::grpc::StatusCode::INVALID_ARGUMENT, "invalid arguments");
  }

  ::vna::core::LeaseInfo in;
  in.leaseId = request->lease_id();
  in.resourceId = request->resource_id();
  in.ttlSeconds = request->ttl_seconds();

  const ::vna::core::Status status = brokerService_->Renew(in, in.ttlSeconds == 0 ? 30 : in.ttlSeconds);
  response->set_ok(status == ::vna::core::Status::kOk);
  if (status != ::vna::core::Status::kOk) {
    response->add_errors("renew failed");
  }
  return ::grpc::Status::OK;
}

::grpc::Status ResourceBrokerGrpcService::Release(::grpc::ServerContext* /*context*/,
                                                  const ::vna::LeaseInfo* request,
                                                  ::vna::ValidationResult* response) {
  if (brokerService_ == nullptr || request == nullptr || response == nullptr) {
    return ::grpc::Status(::grpc::StatusCode::INVALID_ARGUMENT, "invalid arguments");
  }

  ::vna::core::LeaseInfo in;
  in.leaseId = request->lease_id();
  in.resourceId = request->resource_id();
  in.ttlSeconds = request->ttl_seconds();

  const ::vna::core::Status status = brokerService_->Release(in);
  response->set_ok(status == ::vna::core::Status::kOk);
  if (status != ::vna::core::Status::kOk) {
    response->add_errors("release failed");
  }
  return ::grpc::Status::OK;
}

}  // namespace service
}  // namespace vna
