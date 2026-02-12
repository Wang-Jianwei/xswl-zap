#include "core/hardware_coordinator.h"

#include <chrono>
#include <complex>
#include <vector>

namespace vna {
namespace core {

namespace {

Status MapDriverStatus(DriverStatus status) {
  switch (status) {
    case DriverStatus::kOk:
      return Status::kOk;
    case DriverStatus::kTimeout:
      return Status::kTimeout;
    case DriverStatus::kUnsupported:
      return Status::kUnsupported;
    case DriverStatus::kInvalidArgument:
      return Status::kInvalidArgument;
    case DriverStatus::kInternalError:
    default:
      return Status::kInternalError;
  }
}

std::uint64_t NowNs() {
  const std::chrono::steady_clock::time_point now = std::chrono::steady_clock::now();
  const std::chrono::nanoseconds ns =
      std::chrono::duration_cast<std::chrono::nanoseconds>(now.time_since_epoch());
  return static_cast<std::uint64_t>(ns.count());
}

}  // namespace

HardwareCoordinator::HardwareCoordinator() : initialized_(false) {}

Status HardwareCoordinator::SetDriver(std::unique_ptr<HardwareDriver> driver) {
  if (!driver) {
    return Status::kInvalidArgument;
  }
  driver_ = std::move(driver);
  initialized_ = false;
  return Status::kOk;
}

HardwareDriver* HardwareCoordinator::GetDriver() const {
  return driver_.get();
}

Status HardwareCoordinator::Initialize() {
  if (!driver_) {
    return Status::kInvalidArgument;
  }
  const Status status = MapDriverStatus(driver_->Initialize());
  initialized_ = (status == Status::kOk);
  return status;
}

Status HardwareCoordinator::Shutdown() {
  if (!driver_) {
    return Status::kOk;
  }
  initialized_ = false;
  return MapDriverStatus(driver_->Shutdown());
}

Status HardwareCoordinator::Acquire(const std::string& instanceId,
                                    const ExcitationConfig& excitation,
                                    std::uint32_t sampleCount,
                                    std::uint32_t timeoutMs,
                                    AcquisitionResult& out) {
  if (!initialized_ || !driver_ || instanceId.empty() || sampleCount == 0) {
    return Status::kInvalidArgument;
  }

  if (excitation.mode == ExcitationMode::kContinuousWave) {
    return AcquireCw(instanceId, excitation, sampleCount, timeoutMs, out);
  }
  if (excitation.mode == ExcitationMode::kPulse) {
    return AcquirePulse(instanceId, excitation, sampleCount, timeoutMs, out);
  }

  return Status::kUnsupported;
}

Status HardwareCoordinator::AcquireCw(const std::string& instanceId,
                                      const ExcitationConfig& excitation,
                                      std::uint32_t sampleCount,
                                      std::uint32_t timeoutMs,
                                      AcquisitionResult& out) {
  (void)timeoutMs;

  Status status = MapDriverStatus(driver_->SetFrequency(excitation.cw.frequencyHz));
  if (status != Status::kOk) {
    return status;
  }
  status = MapDriverStatus(driver_->SetPower(excitation.cw.powerDbm));
  if (status != Status::kOk) {
    return status;
  }

  std::vector<std::complex<double>> iq;
  status = MapDriverStatus(driver_->AcquireIq(iq, sampleCount));
  if (status != Status::kOk) {
    return status;
  }

  std::complex<double> sum(0.0, 0.0);
  for (std::size_t index = 0; index < iq.size(); ++index) {
    sum += iq[index];
  }
  const std::complex<double> mean = iq.empty() ? std::complex<double>(0.0, 0.0)
                                               : (sum / static_cast<double>(iq.size()));

  out = AcquisitionResult();
  out.instanceId = instanceId;
  out.timestampNs = NowNs();
  out.dataType = AcquisitionDataType::kFrequencyDomain;
  out.frequencyDomain.frequenciesHz.assign(1, excitation.cw.frequencyHz);
  out.frequencyDomain.samples.assign(1, mean);

  return Status::kOk;
}

Status HardwareCoordinator::AcquirePulse(const std::string& instanceId,
                                         const ExcitationConfig& excitation,
                                         std::uint32_t sampleCount,
                                         std::uint32_t timeoutMs,
                                         AcquisitionResult& out) {
  (void)timeoutMs;

  const HardwareCapabilities caps = driver_->GetCapabilities();
  if (!caps.supportsPulseExcitation) {
    return Status::kUnsupported;
  }

  PulseConfig config;
  config.centerFrequencyHz = excitation.pulse.centerFrequencyHz;
  config.powerDbm = excitation.pulse.powerDbm;
  config.pulseWidthNs = excitation.pulse.pulseWidthNs;
  config.pulsePeriodNs = excitation.pulse.pulsePeriodNs;
  config.riseTimeNs = excitation.pulse.riseTimeNs;

  Status status = MapDriverStatus(driver_->SetPulseMode(config));
  if (status != Status::kOk) {
    return status;
  }

  std::vector<std::complex<double>> iq;
  status = MapDriverStatus(driver_->AcquireIq(iq, sampleCount));
  if (status != Status::kOk) {
    return status;
  }

  out = AcquisitionResult();
  out.instanceId = instanceId;
  out.timestampNs = NowNs();
  out.dataType = AcquisitionDataType::kTimeDomain;

  out.timeDomain.timePointsNs.clear();
  out.timeDomain.magnitude.clear();
  out.timeDomain.phase.clear();
  out.timeDomain.timePointsNs.reserve(iq.size());
  out.timeDomain.magnitude.reserve(iq.size());
  out.timeDomain.phase.reserve(iq.size());
  out.timeDomain.sampleRateGhz = caps.maxSamplingRateGhz;

  for (std::size_t index = 0; index < iq.size(); ++index) {
    out.timeDomain.timePointsNs.push_back(static_cast<double>(index));
    out.timeDomain.magnitude.push_back(std::abs(iq[index]));
    out.timeDomain.phase.push_back(std::arg(iq[index]));
  }

  return Status::kOk;
}

}  // namespace core
}  // namespace vna
