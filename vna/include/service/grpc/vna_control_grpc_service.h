#pragma once

#include <map>
#include <mutex>

#include "service/service_status_service.h"
#include "service/vna_control_inproc_handler.h"
#include "service/vna_control_service.h"

#include "vna.grpc.pb.h"

namespace vna {
namespace service {

// gRPC adapter for VnaControl unary methods.
// Pre-GA minimal scope: ValidateTopology + GetServiceStatus.
class VnaControlGrpcService final : public ::vna::VnaControl::Service {
 public:
  VnaControlGrpcService(VnaControlService* controlService,
                        ServiceStatusService* statusService,
                        VnaControlInProcessHandler* inprocHandler,
                        std::uint32_t streamThrottleEveryNFrames = 4,
                        std::uint32_t streamThrottleMs = 10);

  ::grpc::Status ValidateTopology(::grpc::ServerContext* context,
                                  const ::vna::Topology* request,
                                  ::vna::ValidationResult* response) override;

  ::grpc::Status UpsertWorkspaceTopology(::grpc::ServerContext* context,
                                         const ::vna::WorkspaceTopologyUpsertRequest* request,
                                         ::vna::ValidationResult* response) override;

  ::grpc::Status GetWorkspaceTopology(::grpc::ServerContext* context,
                                      const ::vna::WorkspaceRef* request,
                                      ::vna::WorkspaceTopologyConfig* response) override;

  ::grpc::Status ListWorkspaceTopologies(::grpc::ServerContext* context,
                                         const ::vna::Empty* request,
                                         ::vna::WorkspaceTopologyList* response) override;

  ::grpc::Status SetActiveWorkspace(::grpc::ServerContext* context,
                                    const ::vna::WorkspaceRef* request,
                                    ::vna::ValidationResult* response) override;

  ::grpc::Status GetServiceStatus(::grpc::ServerContext* context,
                                  const ::vna::Empty* request,
                                  ::vna::ServiceStatus* response) override;

  ::grpc::Status GetInstanceCapabilities(::grpc::ServerContext* context,
                                         const ::vna::InstanceSelector* request,
                                         ::vna::InstanceCapabilities* response) override;

  ::grpc::Status SetScanState(::grpc::ServerContext* context,
                              const ::vna::ScanStateRequest* request,
                              ::vna::ScanStateResponse* response) override;

  ::grpc::Status GetScanState(::grpc::ServerContext* context,
                              const ::vna::InstanceSelector* request,
                              ::vna::ScanStateResponse* response) override;

  ::grpc::Status Acquire(::grpc::ServerContext* context,
                         const ::vna::AcquisitionRequest* request,
                         ::vna::AcquisitionResult* response) override;

  ::grpc::Status ImportAcquisition(::grpc::ServerContext* context,
                                   const ::vna::ImportAcquisitionRequest* request,
                                   ::vna::AcquisitionResult* response) override;

  ::grpc::Status CompareImportedAcquisition(
      ::grpc::ServerContext* context,
      const ::vna::CompareImportedAcquisitionRequest* request,
      ::vna::CompareImportedAcquisitionResponse* response) override;

  ::grpc::Status StreamAcquisition(::grpc::ServerContext* context,
                                   const ::vna::AcquisitionRequest* request,
                                   ::grpc::ServerWriter<::vna::AcquisitionResult>* writer) override;

 private:
  VnaControlService* controlService_;
  ServiceStatusService* statusService_;
  VnaControlInProcessHandler* inprocHandler_;
  std::uint32_t streamThrottleEveryNFrames_;
  std::uint32_t streamThrottleMs_;
  mutable std::mutex scanStateMutex_;
  std::map<std::string, ::vna::ScanState> scanStates_;
};

}  // namespace service
}  // namespace vna
