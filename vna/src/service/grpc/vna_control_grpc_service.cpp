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
}

::vna::core::ExcitationConfig BuildCoreExcitation(const ::vna::AcquisitionRequest& request) {
  ::vna::core::ExcitationConfig excitation;
  excitation.mode = ToCoreExcitationMode(request.excitation().mode());
  excitation.settlingTimeMs = request.excitation().settling_time_ms();
  excitation.enableAutoTrigger = request.excitation().enable_auto_trigger();
  excitation.cw.frequencyHz = request.excitation().cw().frequency_hz();
  excitation.cw.powerDbm = request.excitation().cw().power_dbm();
  excitation.cw.dwellTimeMs = request.excitation().cw().dwell_time_ms();
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
                                             VnaControlInProcessHandler* inprocHandler)
    : controlService_(controlService),
      statusService_(statusService),
      inprocHandler_(inprocHandler) {}

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

  FillProtoFromCoreResult(result, response);
  return ::grpc::Status::OK;
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
    if (frameCount % 4 == 0) {
      std::this_thread::sleep_for(std::chrono::milliseconds(10));
    }
  }

  return ::grpc::Status(::grpc::StatusCode::CANCELLED, "stream cancelled");
}

}  // namespace service
}  // namespace vna
