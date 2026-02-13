#include "service/grpc/vna_control_grpc_service.h"

#include <chrono>
#include <thread>

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

}  // namespace

namespace vna {
namespace service {

VnaControlGrpcService::VnaControlGrpcService(VnaControlService* controlService,
                                             ServiceStatusService* statusService,
                                             VnaControlInProcessHandler* inprocHandler,
                                             std::uint32_t streamThrottleEveryNFrames,
                                             std::uint32_t streamThrottleMs)
    : controlService_(controlService),
      statusService_(statusService),
      inprocHandler_(inprocHandler),
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
  const ::vna::core::Status compareStatus = controlService_->CompareImportedAcquisition(
      request->json_path(), current, request->tolerance(), &diff);
  if (compareStatus == ::vna::core::Status::kOk) {
    response->set_matched(true);
    response->set_detail(diff.empty() ? "COMPARE_MATCHED" : diff);
    return ::grpc::Status::OK;
  }

  if (compareStatus == ::vna::core::Status::kInvalidArgument &&
      diff.find("COMPARE_MISMATCH:") == 0) {
    response->set_matched(false);
    response->set_detail(diff);
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
  int frameCount = 0;

  while (!context->IsCancelled()) {
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
    if (streamThrottleEveryNFrames_ > 0 && streamThrottleMs_ > 0 &&
        frameCount % static_cast<int>(streamThrottleEveryNFrames_) == 0) {
      std::this_thread::sleep_for(
          std::chrono::milliseconds(static_cast<int>(streamThrottleMs_)));
    }
  }

  return ::grpc::Status(::grpc::StatusCode::CANCELLED, "stream cancelled");
}

}  // namespace service
}  // namespace vna
