#pragma once

#include "service/resource_broker_service.h"

#include "vna.grpc.pb.h"

namespace vna {
namespace service {

class ResourceBrokerGrpcService final : public ::vna::ResourceBroker::Service {
 public:
  explicit ResourceBrokerGrpcService(ResourceBrokerService* brokerService);

  ::grpc::Status AcquireLock(::grpc::ServerContext* context,
                             const ::vna::LockAcquireRequest* request,
                             ::vna::LockAcquireResult* response) override;

  ::grpc::Status RenewLock(::grpc::ServerContext* context,
                           const ::vna::LockRenewRequest* request,
                           ::vna::LockOperationResult* response) override;

  ::grpc::Status ReleaseLock(::grpc::ServerContext* context,
                             const ::vna::LockReleaseRequest* request,
                             ::vna::LockOperationResult* response) override;

  ::grpc::Status GetLockSnapshot(::grpc::ServerContext* context,
                                 const ::vna::LockSnapshotRequest* request,
                                 ::vna::LockSnapshot* response) override;

  ::grpc::Status Acquire(::grpc::ServerContext* context,
                         const ::vna::ResourceRequest* request,
                         ::vna::LeaseInfo* response) override;

  ::grpc::Status Renew(::grpc::ServerContext* context,
                       const ::vna::LeaseInfo* request,
                       ::vna::ValidationResult* response) override;

  ::grpc::Status Release(::grpc::ServerContext* context,
                         const ::vna::LeaseInfo* request,
                         ::vna::ValidationResult* response) override;

 private:
  ResourceBrokerService* brokerService_;
};

}  // namespace service
}  // namespace vna
