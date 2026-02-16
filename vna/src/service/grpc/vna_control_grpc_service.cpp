#include "service/grpc/vna_control_grpc_service.h"

#include <chrono>
#include <iostream>
#include <mutex>
#include <sstream>
#include <thread>
#include <vector>

#include "core/excitation_mode.h"
#include "core/measurement_data.h"
#include "core/status.h"

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

::vna::core::ExcitationMode ToCoreExcitationMode(::vna::ExcitationMode mode) {
  if (mode == ::vna::ExcitationMode::EXCITATION_MODE_PULSE) {
    return ::vna::core::ExcitationMode::kPulse;
  }
  return ::vna::core::ExcitationMode::kContinuousWave;
}

::vna::ScanState NormalizeScanState(::vna::ScanState state) {
  if (state == ::vna::ScanState::SCAN_STATE_HOLD ||
      state == ::vna::ScanState::SCAN_STATE_SINGLE ||
      state == ::vna::ScanState::SCAN_STATE_CONTINUOUS) {
    return state;
  }
  return ::vna::ScanState::SCAN_STATE_CONTINUOUS;
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

std::uint64_t NowMs() {
  return static_cast<std::uint64_t>(
      std::chrono::duration_cast<std::chrono::milliseconds>(
          std::chrono::system_clock::now().time_since_epoch())
          .count());
}

void FillProtoFromCoreResult(const ::vna::core::AcquisitionResult& in,
                             ::vna::AcquisitionResult* out) {
  out->set_instance_id(in.instanceId);
  out->set_timestamp_ns(in.timestampNs);

  if (in.dataType == ::vna::core::AcquisitionDataType::kTimeDomain) {
    ::vna::TimeDomainFrame* timeFrame = out->mutable_time_frame();
    timeFrame->set_sample_rate_ghz(in.timeDomain.sampleRateGhz);

    const std::size_t pointCount = in.timeDomain.timePointsNs.size();
    for (std::size_t i = 0; i < pointCount; ++i) {
      ::vna::TimeDomainPoint* point = timeFrame->add_points();
      point->set_time_ns(in.timeDomain.timePointsNs[i]);

      if (i < in.timeDomain.magnitude.size()) {
        point->set_magnitude(in.timeDomain.magnitude[i]);
      }
      if (i < in.timeDomain.phase.size()) {
        point->set_phase(in.timeDomain.phase[i]);
      }
    }
    return;
  }

  ::vna::FrequencyDomainFrame* frequencyFrame = out->mutable_frequency_frame();
  const std::size_t pointCount = in.frequencyDomain.frequenciesHz.size();
  for (std::size_t i = 0; i < pointCount; ++i) {
    ::vna::FrequencyDomainPoint* point = frequencyFrame->add_points();
    point->set_frequency_hz(in.frequencyDomain.frequenciesHz[i]);

    if (i < in.frequencyDomain.samples.size()) {
      point->set_real(in.frequencyDomain.samples[i].real());
      point->set_imag(in.frequencyDomain.samples[i].imag());
    }
  }

  for (std::size_t i = 0; i < in.receiverRaw.points.size(); ++i) {
    const ::vna::core::ReceiverFrequencyPoint& sourcePoint = in.receiverRaw.points[i];
    ::vna::ReceiverFrequencyPoint* targetPoint = out->add_receiver_raw_points();
    targetPoint->set_frequency_hz(sourcePoint.frequencyHz);
    targetPoint->set_timestamp_ns(sourcePoint.timestampNs);

    for (std::size_t channelIndex = 0; channelIndex < sourcePoint.channels.size(); ++channelIndex) {
      const ::vna::core::ReceiverChannelSample& sourceChannel = sourcePoint.channels[channelIndex];
      ::vna::ReceiverChannelSample* targetChannel = targetPoint->add_channels();
      targetChannel->set_channel_id(sourceChannel.channelId);
      targetChannel->set_real(sourceChannel.iq.real());
      targetChannel->set_imag(sourceChannel.iq.imag());
      targetChannel->set_clipped(sourceChannel.clipped);
    }
  }

  for (std::size_t i = 0; i < in.receiverCompensated.points.size(); ++i) {
    const ::vna::core::ReceiverFrequencyPoint& sourcePoint = in.receiverCompensated.points[i];
    ::vna::ReceiverFrequencyPoint* targetPoint = out->add_receiver_compensated_points();
    targetPoint->set_frequency_hz(sourcePoint.frequencyHz);
    targetPoint->set_timestamp_ns(sourcePoint.timestampNs);

    for (std::size_t channelIndex = 0; channelIndex < sourcePoint.channels.size(); ++channelIndex) {
      const ::vna::core::ReceiverChannelSample& sourceChannel = sourcePoint.channels[channelIndex];
      ::vna::ReceiverChannelSample* targetChannel = targetPoint->add_channels();
      targetChannel->set_channel_id(sourceChannel.channelId);
      targetChannel->set_real(sourceChannel.iq.real());
      targetChannel->set_imag(sourceChannel.iq.imag());
      targetChannel->set_clipped(sourceChannel.clipped);
    }
  }

  for (std::size_t i = 0; i < in.sParameters.points.size(); ++i) {
    const ::vna::core::SParameterFrequencyPoint& sourcePoint = in.sParameters.points[i];
    ::vna::SParameterFrequencyPoint* targetPoint = out->add_s_parameter_points();
    targetPoint->set_frequency_hz(sourcePoint.frequencyHz);
    targetPoint->set_port_count(sourcePoint.portCount);

    const std::size_t portCount = static_cast<std::size_t>(sourcePoint.portCount);
    const std::size_t expectedSize = portCount * portCount;
    const std::size_t matrixSize = sourcePoint.matrix.size() < expectedSize
                                       ? sourcePoint.matrix.size()
                                       : expectedSize;
    for (std::size_t matrixIndex = 0; matrixIndex < matrixSize; ++matrixIndex) {
      const std::size_t row = portCount == 0 ? 0 : (matrixIndex / portCount);
      const std::size_t col = portCount == 0 ? 0 : (matrixIndex % portCount);

      ::vna::SParameterPoint* sPoint = targetPoint->add_points();
      sPoint->set_row_port(static_cast<std::uint32_t>(row + 1));
      sPoint->set_col_port(static_cast<std::uint32_t>(col + 1));
      sPoint->set_real(sourcePoint.matrix[matrixIndex].real());
      sPoint->set_imag(sourcePoint.matrix[matrixIndex].imag());
    }
  }
}

::vna::core::ExcitationConfig BuildCoreExcitation(const ::vna::AcquisitionRequest& request) {
  ::vna::core::ExcitationConfig excitation;
  excitation.mode = ToCoreExcitationMode(request.excitation().mode());
  excitation.settlingTimeMs = request.excitation().settling_time_ms();
  excitation.enableAutoTrigger = request.excitation().enable_auto_trigger();
  excitation.cw.frequencyHz = request.excitation().cw().frequency_hz();
  excitation.cw.powerDbm = request.excitation().cw().power_dbm();
  excitation.cw.dwellTimeMs = request.excitation().cw().dwell_time_ms();
  excitation.cw.startFrequencyHz = request.excitation().cw().start_frequency_hz();
  excitation.cw.stopFrequencyHz = request.excitation().cw().stop_frequency_hz();
  excitation.cw.sweepPointCount = request.excitation().cw().sweep_point_count();
  excitation.cw.ifBandwidthHz = request.excitation().cw().if_bandwidth_hz();
  excitation.cw.portCount = request.excitation().cw().port_count();
  excitation.cw.excitationPort = request.excitation().cw().excitation_port();
  excitation.pulse.centerFrequencyHz = request.excitation().pulse().center_frequency_hz();
  excitation.pulse.pulseWidthNs = request.excitation().pulse().pulse_width_ns();
  excitation.pulse.pulsePeriodNs = request.excitation().pulse().pulse_period_ns();
  excitation.pulse.powerDbm = request.excitation().pulse().power_dbm();
  excitation.pulse.riseTimeNs = request.excitation().pulse().rise_time_ns();
  return excitation;
}

std::string BuildRequestConfigDigest(const ::vna::AcquisitionRequest& request) {
  std::ostringstream oss;
  oss << "instance=" << request.instance_id()
      << ", sample_count=" << request.sample_count()
      << ", timeout_ms=" << request.timeout_ms()
      << ", mode=" << request.excitation().mode();

  if (request.excitation().mode() == ::vna::ExcitationMode::EXCITATION_MODE_PULSE) {
    oss << ", pulse.center_hz=" << request.excitation().pulse().center_frequency_hz()
        << ", pulse.width_ns=" << request.excitation().pulse().pulse_width_ns()
        << ", pulse.period_ns=" << request.excitation().pulse().pulse_period_ns()
        << ", pulse.power_dbm=" << request.excitation().pulse().power_dbm();
  } else {
    oss << ", cw.start_hz=" << request.excitation().cw().start_frequency_hz()
        << ", cw.stop_hz=" << request.excitation().cw().stop_frequency_hz()
        << ", cw.points=" << request.excitation().cw().sweep_point_count()
        << ", cw.ifbw_hz=" << request.excitation().cw().if_bandwidth_hz();
  }

  return oss.str();
}

std::string BuildGrpcCompareContextToken(const ::vna::CompareImportedAcquisitionRequest& request) {
  std::ostringstream oss;
  oss << "grpc_compare_token="
      << "instance:" << request.current_request().instance_id()
      << "|sample:" << request.current_request().sample_count()
      << "|timeout_ms:" << request.current_request().timeout_ms()
      << "|tolerance:" << request.tolerance();
  return oss.str();
}

std::string AppendCompareContextToken(const std::string& detail,
                                      const std::string& contextToken) {
  if (detail.empty()) {
    return contextToken;
  }
  return detail + ", " + contextToken;
}

void FillValidationResultFromReport(const ::vna::service::TopologyValidationReport& report,
                                    ::vna::ValidationResult* response) {
  response->set_ok(report.ok);
  for (std::size_t i = 0; i < report.errors.size(); ++i) {
    response->add_errors(report.errors[i].message);
    ::vna::TopologyErrorDetail* detail = response->add_error_details();
    detail->set_code(report.errors[i].code);
    detail->set_field(report.errors[i].field);
    detail->set_message(report.errors[i].message);
  }
}

void LogConfigTransitionIfChanged(const char* scope, const ::vna::AcquisitionRequest& request) {
  static std::mutex logMutex;
  static std::string lastAcquireDigest;
  static std::string lastStreamDigest;

  const std::string digest = BuildRequestConfigDigest(request);

  std::lock_guard<std::mutex> lock(logMutex);
  std::string* lastDigest = nullptr;
  if (std::string(scope) == "ACQUIRE") {
    lastDigest = &lastAcquireDigest;
  } else {
    lastDigest = &lastStreamDigest;
  }

  if (lastDigest->empty()) {
    std::cout << "[CONFIG_INIT][" << scope << "] " << digest << "\n";
    *lastDigest = digest;
    return;
  }

  if (*lastDigest != digest) {
    std::cout << "[CONFIG_CHANGED][" << scope << "] from{" << *lastDigest << "} to{" << digest << "}\n";
    *lastDigest = digest;
  }
}

}  // namespace

namespace vna {
namespace service {

VnaControlGrpcService::VnaControlGrpcService(VnaControlService* controlService,
                                             ServiceStatusService* statusService,
                                             VnaControlInProcessHandler* inprocHandler,
                                             std::uint32_t streamThrottleEveryNFrames,
                                             std::uint32_t streamThrottleMs,
                                             ResourceBrokerService* brokerService)
    : controlService_(controlService),
      statusService_(statusService),
      inprocHandler_(inprocHandler),
      brokerService_(brokerService),
      streamThrottleEveryNFrames_(streamThrottleEveryNFrames),
      streamThrottleMs_(streamThrottleMs) {}

::grpc::Status VnaControlGrpcService::ValidateTopology(::grpc::ServerContext* /*context*/,
                                                       const ::vna::Topology* request,
                                                       ::vna::ValidationResult* response) {
  if (controlService_ == nullptr || request == nullptr || response == nullptr) {
    return ::grpc::Status(::grpc::StatusCode::INVALID_ARGUMENT, "invalid arguments");
  }

  ::vna::core::Topology topology;
  topology.id = request->id();
  topology.yaml = request->yaml();

  const TopologyValidationReport report = controlService_->ValidateTopologyStructured(topology);
  response->set_ok(report.ok);

  const ::vna::core::ValidationResult plain = controlService_->ValidateTopology(topology);
  for (std::size_t i = 0; i < plain.errors.size(); ++i) {
    response->add_errors(plain.errors[i]);
  }

  for (std::size_t i = 0; i < report.errors.size(); ++i) {
    ::vna::TopologyErrorDetail* detail = response->add_error_details();
    detail->set_code(report.errors[i].code);
    detail->set_field(report.errors[i].field);
    detail->set_message(report.errors[i].message);
  }

  return ::grpc::Status::OK;
}

::grpc::Status VnaControlGrpcService::PrecheckWorkspaceTopology(
    ::grpc::ServerContext* /*context*/,
    const ::vna::TopologyPrecheckRequest* request,
    ::vna::TopologyPrecheckResult* response) {
  if (controlService_ == nullptr || request == nullptr || response == nullptr) {
    return ::grpc::Status(::grpc::StatusCode::INVALID_ARGUMENT, "invalid arguments");
  }

  if (request->workspace_id().empty()) {
    return ::grpc::Status(::grpc::StatusCode::INVALID_ARGUMENT, "workspace_id is required");
  }

  ::vna::service::TopologyPrecheckRequest precheckRequest;
  precheckRequest.workspaceId = request->workspace_id();
  precheckRequest.topology.id = request->topology().id();
  precheckRequest.topology.yaml = request->topology().yaml();
  precheckRequest.activate = request->activate();
  precheckRequest.destructiveChange = request->destructive_change();
  precheckRequest.requester.workspaceId = request->workspace_id();
  precheckRequest.requester.actor = "grpc.vna_control";

  for (int i = 0; i < request->required_resources_size(); ++i) {
    const ::vna::LockSelector& in = request->required_resources(i);
    ::vna::service::LockSelector selector;
    selector.type = ToServiceLockResourceType(in.type());
    selector.resourceId = in.resource_id();
    precheckRequest.requiredResources.push_back(selector);
  }

  const ::vna::service::TopologyPrecheckResult precheckResult =
      controlService_->PrecheckWorkspaceTopology(precheckRequest, brokerService_);

  response->set_ok(precheckResult.ok);
  response->set_code(precheckResult.code);
  response->set_message(precheckResult.message);

  for (std::size_t i = 0; i < precheckResult.topologyErrors.size(); ++i) {
    ::vna::TopologyErrorDetail* detail = response->add_topology_errors();
    detail->set_code(precheckResult.topologyErrors[i].code);
    detail->set_field(precheckResult.topologyErrors[i].field);
    detail->set_message(precheckResult.topologyErrors[i].message);
  }

  for (std::size_t i = 0; i < precheckResult.lockConflicts.size(); ++i) {
    const ::vna::service::LockConflictDetail& conflict = precheckResult.lockConflicts[i];
    ::vna::LockConflictDetail* out = response->add_lock_conflicts();
    out->mutable_selector()->set_type(ToProtoLockResourceType(conflict.selector.type));
    out->mutable_selector()->set_resource_id(conflict.selector.resourceId);
    out->set_holder_lease_id(conflict.holderLeaseId);
    out->mutable_holder_owner()->set_workspace_id(conflict.holderOwner.workspaceId);
    out->mutable_holder_owner()->set_instance_id(conflict.holderOwner.instanceId);
    out->mutable_holder_owner()->set_session_id(conflict.holderOwner.sessionId);
    out->mutable_holder_owner()->set_actor(conflict.holderOwner.actor);
    out->set_holder_fencing_token(conflict.holderFencingToken);
    out->set_holder_expire_at_ms(conflict.holderExpireAtMs);
    out->set_suggestion(conflict.suggestion);
  }

  return ::grpc::Status::OK;
}

::grpc::Status VnaControlGrpcService::UpsertWorkspaceTopology(
    ::grpc::ServerContext* /*context*/,
    const ::vna::WorkspaceTopologyUpsertRequest* request,
    ::vna::ValidationResult* response) {
  if (controlService_ == nullptr || request == nullptr || response == nullptr) {
    return ::grpc::Status(::grpc::StatusCode::INVALID_ARGUMENT, "invalid arguments");
  }

  if (request->workspace_id().empty()) {
    return ::grpc::Status(::grpc::StatusCode::INVALID_ARGUMENT, "workspace_id is required");
  }

  ::vna::core::Topology topology;
  topology.id = request->topology().id();
  topology.yaml = request->topology().yaml();

  TopologyValidationReport report;
  const ::vna::core::Status status = controlService_->UpsertWorkspaceTopology(
      request->workspace_id(), topology, request->activate(), &report);

  FillValidationResultFromReport(report, response);
  if (status == ::vna::core::Status::kOk) {
    response->set_ok(true);
    return ::grpc::Status::OK;
  }

  if (status == ::vna::core::Status::kInvalidArgument && !report.errors.empty()) {
    response->set_ok(false);
    return ::grpc::Status::OK;
  }
  return ToGrpcStatus(status, "upsert workspace topology failed");
}

::grpc::Status VnaControlGrpcService::GetWorkspaceTopology(
    ::grpc::ServerContext* /*context*/,
    const ::vna::WorkspaceRef* request,
    ::vna::WorkspaceTopologyConfig* response) {
  if (controlService_ == nullptr || request == nullptr || response == nullptr) {
    return ::grpc::Status(::grpc::StatusCode::INVALID_ARGUMENT, "invalid arguments");
  }

  if (request->workspace_id().empty()) {
    return ::grpc::Status(::grpc::StatusCode::INVALID_ARGUMENT, "workspace_id is required");
  }

  WorkspaceTopologyConfig config;
  const ::vna::core::Status status =
      controlService_->GetWorkspaceTopology(request->workspace_id(), config);
  if (status != ::vna::core::Status::kOk) {
    return ToGrpcStatus(status, "workspace topology not found");
  }

  response->set_workspace_id(config.workspaceId);
  response->mutable_topology()->set_id(config.topology.id);
  response->mutable_topology()->set_yaml(config.topology.yaml);
  response->set_is_active(config.isActive);
  response->set_updated_at_ms(config.updatedAtMs);
  return ::grpc::Status::OK;
}

::grpc::Status VnaControlGrpcService::ListWorkspaceTopologies(
    ::grpc::ServerContext* /*context*/,
    const ::vna::Empty* /*request*/,
    ::vna::WorkspaceTopologyList* response) {
  if (controlService_ == nullptr || response == nullptr) {
    return ::grpc::Status(::grpc::StatusCode::INVALID_ARGUMENT, "invalid arguments");
  }

  const std::vector<WorkspaceTopologyConfig> configs = controlService_->ListWorkspaceTopologies();
  for (std::size_t i = 0; i < configs.size(); ++i) {
    ::vna::WorkspaceTopologyConfig* item = response->add_items();
    item->set_workspace_id(configs[i].workspaceId);
    item->mutable_topology()->set_id(configs[i].topology.id);
    item->mutable_topology()->set_yaml(configs[i].topology.yaml);
    item->set_is_active(configs[i].isActive);
    item->set_updated_at_ms(configs[i].updatedAtMs);
  }
  response->set_active_workspace_id(controlService_->GetActiveWorkspaceId());
  return ::grpc::Status::OK;
}

::grpc::Status VnaControlGrpcService::SetActiveWorkspace(
    ::grpc::ServerContext* /*context*/,
    const ::vna::WorkspaceRef* request,
    ::vna::ValidationResult* response) {
  if (controlService_ == nullptr || request == nullptr || response == nullptr) {
    return ::grpc::Status(::grpc::StatusCode::INVALID_ARGUMENT, "invalid arguments");
  }

  if (request->workspace_id().empty()) {
    return ::grpc::Status(::grpc::StatusCode::INVALID_ARGUMENT, "workspace_id is required");
  }

  const ::vna::core::Status status = controlService_->SetActiveWorkspace(request->workspace_id());
  if (status != ::vna::core::Status::kOk) {
    response->set_ok(false);
    response->add_errors("workspace not found");
    return ToGrpcStatus(status, "set active workspace failed");
  }

  response->set_ok(true);
  return ::grpc::Status::OK;
}

::grpc::Status VnaControlGrpcService::GetServiceStatus(::grpc::ServerContext* /*context*/,
                                                       const ::vna::Empty* /*request*/,
                                                       ::vna::ServiceStatus* response) {
  if (statusService_ == nullptr || inprocHandler_ == nullptr || response == nullptr) {
    return ::grpc::Status(::grpc::StatusCode::INVALID_ARGUMENT, "invalid arguments");
  }

  ServiceStatusResponse mapped;
  const ::vna::core::Status status = inprocHandler_->GetServiceStatus(*statusService_, mapped);
  if (status != ::vna::core::Status::kOk) {
    return ::grpc::Status(::grpc::StatusCode::INTERNAL, "failed to get service status");
  }

  response->set_ready(mapped.ready);
  response->set_state(mapped.state);
  response->set_message(mapped.message);
  response->set_bootstrap_mode(mapped.bootstrapMode);
  response->set_config_path(mapped.configPath);
  response->set_uptime_ms(mapped.uptimeMs);
  response->set_bind_address(mapped.bindAddress);
  response->set_port(mapped.port);
  response->set_tls_enabled(mapped.tlsEnabled);
  response->set_log_level(mapped.logLevel);
  response->set_instance_count(mapped.instanceCount);
  response->set_active_lease_count(mapped.activeLeaseCount);

  return ::grpc::Status::OK;
}

::grpc::Status VnaControlGrpcService::GetInstanceCapabilities(
    ::grpc::ServerContext* /*context*/,
    const ::vna::InstanceSelector* request,
    ::vna::InstanceCapabilities* response) {
  if (controlService_ == nullptr || request == nullptr || response == nullptr) {
    return ::grpc::Status(::grpc::StatusCode::INVALID_ARGUMENT, "invalid arguments");
  }

  if (request->instance_id().empty()) {
    return ::grpc::Status(::grpc::StatusCode::INVALID_ARGUMENT, "instance_id is required");
  }

  ::vna::core::HardwareCapabilities capabilities;
  const ::vna::core::Status status = controlService_->GetInstanceCapabilities(
      request->instance_id(), capabilities);
  if (status != ::vna::core::Status::kOk) {
    return ToGrpcStatus(status, "failed to get instance capabilities");
  }

  response->set_supports_pulse_excitation(capabilities.supportsPulseExcitation);
  response->set_supports_multi_tone(capabilities.supportsMultiTone);
  response->set_supports_external_clock(capabilities.supportsExternalClock);
  response->set_min_pulse_width_ns(capabilities.minPulseWidthNs);
  response->set_min_pulse_period_ns(capabilities.minPulsePeriodNs);
  response->set_max_sampling_rate_ghz(capabilities.maxSamplingRateGhz);
  return ::grpc::Status::OK;
}

::grpc::Status VnaControlGrpcService::SetScanState(
    ::grpc::ServerContext* /*context*/,
    const ::vna::ScanStateRequest* request,
    ::vna::ScanStateResponse* response) {
  if (request == nullptr || response == nullptr) {
    return ::grpc::Status(::grpc::StatusCode::INVALID_ARGUMENT, "invalid arguments");
  }
  if (request->instance_id().empty()) {
    return ::grpc::Status(::grpc::StatusCode::INVALID_ARGUMENT, "instance_id is required");
  }

  const ::vna::ScanState desired = NormalizeScanState(request->desired_state());
  {
    std::lock_guard<std::mutex> lock(scanStateMutex_);
    scanStates_[request->instance_id()] = desired;
  }

  response->set_instance_id(request->instance_id());
  response->set_state(desired);
  response->set_stream_active(desired != ::vna::ScanState::SCAN_STATE_HOLD);
  response->set_message("scan state updated");
  response->set_updated_at_ms(NowMs());
  return ::grpc::Status::OK;
}

::grpc::Status VnaControlGrpcService::GetScanState(
    ::grpc::ServerContext* /*context*/,
    const ::vna::InstanceSelector* request,
    ::vna::ScanStateResponse* response) {
  if (request == nullptr || response == nullptr) {
    return ::grpc::Status(::grpc::StatusCode::INVALID_ARGUMENT, "invalid arguments");
  }
  if (request->instance_id().empty()) {
    return ::grpc::Status(::grpc::StatusCode::INVALID_ARGUMENT, "instance_id is required");
  }

  ::vna::ScanState state = ::vna::ScanState::SCAN_STATE_CONTINUOUS;
  {
    std::lock_guard<std::mutex> lock(scanStateMutex_);
    const std::map<std::string, ::vna::ScanState>::const_iterator it = scanStates_.find(request->instance_id());
    if (it != scanStates_.end()) {
      state = NormalizeScanState(it->second);
    } else {
      scanStates_[request->instance_id()] = state;
    }
  }

  response->set_instance_id(request->instance_id());
  response->set_state(state);
  response->set_stream_active(state != ::vna::ScanState::SCAN_STATE_HOLD);
  response->set_message("ok");
  response->set_updated_at_ms(NowMs());
  return ::grpc::Status::OK;
}

::grpc::Status VnaControlGrpcService::Acquire(::grpc::ServerContext* /*context*/,
                                              const ::vna::AcquisitionRequest* request,
                                              ::vna::AcquisitionResult* response) {
  if (controlService_ == nullptr || request == nullptr || response == nullptr) {
    return ::grpc::Status(::grpc::StatusCode::INVALID_ARGUMENT, "invalid arguments");
  }

  if (request->instance_id().empty()) {
    return ::grpc::Status(::grpc::StatusCode::INVALID_ARGUMENT, "instance_id is required");
  }

  if (request->excitation().mode() == ::vna::ExcitationMode::EXCITATION_MODE_UNSPECIFIED) {
    return ::grpc::Status(::grpc::StatusCode::INVALID_ARGUMENT, "excitation.mode is required");
  }

  const ::vna::core::ExcitationConfig excitation = BuildCoreExcitation(*request);
  LogConfigTransitionIfChanged("ACQUIRE", *request);

  ::vna::core::AcquisitionResult result;
  const ::vna::core::Status status = controlService_->AcquireOnce(
      request->instance_id(), excitation, request->sample_count(), request->timeout_ms(), result);
  if (status != ::vna::core::Status::kOk) {
    return ToGrpcStatus(status, "acquire failed");
  }

  if (!request->export_csv_path().empty() ||
      !request->export_touchstone_path().empty() ||
      !request->export_json_path().empty()) {
    std::string exportError;
    const ::vna::core::Status exportStatus = controlService_->ExportAcquisitionResult(
        result,
        request->export_csv_path(),
        request->export_touchstone_path(),
        request->export_json_path(),
        &exportError);
    if (exportStatus != ::vna::core::Status::kOk) {
      const std::string message = exportError.empty() ? "export failed" : "export failed: " + exportError;
      return ToGrpcStatus(exportStatus, message);
    }
  }

  FillProtoFromCoreResult(result, response);
  return ::grpc::Status::OK;
}

::grpc::Status VnaControlGrpcService::ImportAcquisition(
    ::grpc::ServerContext* /*context*/,
    const ::vna::ImportAcquisitionRequest* request,
    ::vna::AcquisitionResult* response) {
  if (controlService_ == nullptr || request == nullptr || response == nullptr) {
    return ::grpc::Status(::grpc::StatusCode::INVALID_ARGUMENT, "invalid arguments");
  }

  if (request->json_path().empty()) {
    return ::grpc::Status(::grpc::StatusCode::INVALID_ARGUMENT, "json_path is required");
  }

  ::vna::core::AcquisitionResult result;
  std::string importError;
  const ::vna::core::Status status =
      controlService_->ImportAcquisitionResult(request->json_path(), result, &importError);
  if (status != ::vna::core::Status::kOk) {
    const std::string message = importError.empty() ? "import failed" : "import failed: " + importError;
    return ToGrpcStatus(status, message);
  }

  FillProtoFromCoreResult(result, response);
  return ::grpc::Status::OK;
}

::grpc::Status VnaControlGrpcService::CompareImportedAcquisition(
    ::grpc::ServerContext* /*context*/,
    const ::vna::CompareImportedAcquisitionRequest* request,
    ::vna::CompareImportedAcquisitionResponse* response) {
  if (controlService_ == nullptr || request == nullptr || response == nullptr) {
    return ::grpc::Status(::grpc::StatusCode::INVALID_ARGUMENT, "invalid arguments");
  }

  if (request->json_path().empty()) {
    return ::grpc::Status(::grpc::StatusCode::INVALID_ARGUMENT, "json_path is required");
  }

  if (request->current_request().instance_id().empty()) {
    return ::grpc::Status(::grpc::StatusCode::INVALID_ARGUMENT, "current_request.instance_id is required");
  }

  if (request->current_request().excitation().mode() ==
      ::vna::ExcitationMode::EXCITATION_MODE_UNSPECIFIED) {
    return ::grpc::Status(::grpc::StatusCode::INVALID_ARGUMENT,
                          "current_request.excitation.mode is required");
  }

  if (request->tolerance() <= 0.0) {
    return ::grpc::Status(::grpc::StatusCode::INVALID_ARGUMENT, "tolerance must be > 0");
  }

  const ::vna::core::ExcitationConfig excitation = BuildCoreExcitation(request->current_request());
  ::vna::core::AcquisitionResult current;
  const ::vna::core::Status acquireStatus = controlService_->AcquireOnce(
      request->current_request().instance_id(),
      excitation,
      request->current_request().sample_count(),
      request->current_request().timeout_ms(),
      current);
  if (acquireStatus != ::vna::core::Status::kOk) {
    return ToGrpcStatus(acquireStatus, "compare acquire failed");
  }

  std::string diff;
  const std::string contextToken = BuildGrpcCompareContextToken(*request);
  const ::vna::core::Status compareStatus = controlService_->CompareImportedAcquisition(
      request->json_path(), current, request->tolerance(), &diff);
  if (compareStatus == ::vna::core::Status::kOk) {
    response->set_matched(true);
    const std::string detail = diff.empty() ? "COMPARE_MATCHED" : diff;
    response->set_detail(AppendCompareContextToken(detail, contextToken));
    return ::grpc::Status::OK;
  }

  if (compareStatus == ::vna::core::Status::kInvalidArgument &&
      diff.find("COMPARE_MISMATCH:") == 0) {
    response->set_matched(false);
    response->set_detail(AppendCompareContextToken(diff, contextToken));
    return ::grpc::Status::OK;
  }

  const std::string message = diff.empty() ? "compare failed" : "compare failed: " + diff;
  return ToGrpcStatus(compareStatus, message);
}

::grpc::Status VnaControlGrpcService::StreamAcquisition(
    ::grpc::ServerContext* context,
    const ::vna::AcquisitionRequest* request,
    ::grpc::ServerWriter<::vna::AcquisitionResult>* writer) {
  if (controlService_ == nullptr || request == nullptr || writer == nullptr) {
    return ::grpc::Status(::grpc::StatusCode::INVALID_ARGUMENT, "invalid arguments");
  }

  if (request->instance_id().empty()) {
    return ::grpc::Status(::grpc::StatusCode::INVALID_ARGUMENT, "instance_id is required");
  }

  if (request->excitation().mode() == ::vna::ExcitationMode::EXCITATION_MODE_UNSPECIFIED) {
    return ::grpc::Status(::grpc::StatusCode::INVALID_ARGUMENT, "excitation.mode is required");
  }

  if (context != nullptr && context->IsCancelled()) {
    return ::grpc::Status(::grpc::StatusCode::CANCELLED, "stream cancelled");
  }

  const ::vna::core::ExcitationConfig excitation = BuildCoreExcitation(*request);
  LogConfigTransitionIfChanged("STREAM", *request);
  int frameCount = 0;

  {
    std::lock_guard<std::mutex> lock(scanStateMutex_);
    if (scanStates_.find(request->instance_id()) == scanStates_.end()) {
      scanStates_[request->instance_id()] = ::vna::ScanState::SCAN_STATE_CONTINUOUS;
    }
  }

  std::cout << "[STREAM_STATE] started instance=" << request->instance_id() << "\n";

  while (!context->IsCancelled()) {
    ::vna::ScanState state = ::vna::ScanState::SCAN_STATE_CONTINUOUS;
    {
      std::lock_guard<std::mutex> lock(scanStateMutex_);
      const std::map<std::string, ::vna::ScanState>::const_iterator it = scanStates_.find(request->instance_id());
      if (it != scanStates_.end()) {
        state = NormalizeScanState(it->second);
      }
    }

    if (state == ::vna::ScanState::SCAN_STATE_HOLD) {
      std::this_thread::sleep_for(std::chrono::milliseconds(30));
      continue;
    }

    ::vna::core::AcquisitionResult coreResult;
    const ::vna::core::Status status = controlService_->AcquireOnce(
        request->instance_id(), excitation, request->sample_count(), request->timeout_ms(), coreResult);
    if (status != ::vna::core::Status::kOk) {
      return ToGrpcStatus(status, "stream acquisition failed");
    }

    ::vna::AcquisitionResult response;
    FillProtoFromCoreResult(coreResult, &response);

    if (!writer->Write(response)) {
      return ::grpc::Status(::grpc::StatusCode::CANCELLED, "stream write failed");
    }

    ++frameCount;

    if (state == ::vna::ScanState::SCAN_STATE_SINGLE) {
      std::lock_guard<std::mutex> lock(scanStateMutex_);
      scanStates_[request->instance_id()] = ::vna::ScanState::SCAN_STATE_HOLD;
      continue;
    }

    if (streamThrottleEveryNFrames_ > 0 && streamThrottleMs_ > 0 &&
        frameCount % static_cast<int>(streamThrottleEveryNFrames_) == 0) {
      std::this_thread::sleep_for(
          std::chrono::milliseconds(static_cast<int>(streamThrottleMs_)));
    }
  }

  std::cout << "[STREAM_STATE] cancelled instance=" << request->instance_id()
            << ", frames=" << frameCount << "\n";
  return ::grpc::Status(::grpc::StatusCode::CANCELLED, "stream cancelled");
}

}  // namespace service
}  // namespace vna
