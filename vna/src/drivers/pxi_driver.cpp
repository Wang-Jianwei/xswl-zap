#include "drivers/pxi_driver.h"

#include <cmath>

namespace vna {
namespace drivers {

PXIDriver::PXIDriver(const std::string& sessionHandle)
    : sessionHandle_(sessionHandle),
      initialized_(false),
      currentFrequencyHz_(1e9),
      currentPowerDbm_(0.0),
      triggerMode_(core::TriggerMode::kInternal),
      triggerEdge_(core::TriggerEdge::kRising) {}

core::DriverStatus PXIDriver::Initialize() {
  if (sessionHandle_.empty()) {
    return core::DriverStatus::kInvalidArgument;
  }
  initialized_ = true;
  return core::DriverStatus::kOk;
}

core::DriverStatus PXIDriver::Shutdown() {
  initialized_ = false;
  return core::DriverStatus::kOk;
}

std::string PXIDriver::GetModel() const {
  return "PXI-MOCK-VNA";
}

std::string PXIDriver::GetSerialNumber() const {
  return sessionHandle_;
}

core::HardwareCapabilities PXIDriver::GetCapabilities() const {
  core::HardwareCapabilities capabilities;
  capabilities.supportsPulseExcitation = true;
  capabilities.supportsMultiTone = true;
  capabilities.supportsExternalClock = true;
  capabilities.minPulseWidthNs = 10;
  capabilities.minPulsePeriodNs = 50;
  capabilities.maxSamplingRateGhz = 2.5;
  return capabilities;
}

core::DriverStatus PXIDriver::SetFrequency(double frequencyHz) {
  if (!initialized_ || frequencyHz <= 0.0) {
    return core::DriverStatus::kInvalidArgument;
  }
  currentFrequencyHz_ = frequencyHz;
  return core::DriverStatus::kOk;
}

core::DriverStatus PXIDriver::SetPower(double powerDbm) {
  if (!initialized_) {
    return core::DriverStatus::kInternalError;
  }
  currentPowerDbm_ = powerDbm;
  return core::DriverStatus::kOk;
}

core::DriverStatus PXIDriver::SetPulseMode(const core::PulseConfig& config) {
  if (!initialized_) {
    return core::DriverStatus::kInternalError;
  }
  if (config.pulseWidthNs == 0 || config.pulsePeriodNs == 0 ||
      config.pulseWidthNs >= config.pulsePeriodNs) {
    return core::DriverStatus::kInvalidArgument;
  }
  return core::DriverStatus::kOk;
}

core::DriverStatus PXIDriver::AcquireIq(std::vector<std::complex<double>>& samples,
                                        std::uint32_t sampleCount) {
  if (!initialized_ || sampleCount == 0) {
    return core::DriverStatus::kInvalidArgument;
  }

  samples.clear();
  samples.reserve(sampleCount);

  const double amplitude = std::pow(10.0, currentPowerDbm_ / 20.0);
  for (std::uint32_t index = 0; index < sampleCount; ++index) {
    const double phase = (2.0 * 3.141592653589793 * static_cast<double>(index)) /
                         static_cast<double>(sampleCount);
    samples.push_back(std::complex<double>(amplitude * std::cos(phase), amplitude * std::sin(phase)));
  }
  return core::DriverStatus::kOk;
}

core::DriverStatus PXIDriver::SetTriggerMode(core::TriggerMode mode) {
  triggerMode_ = mode;
  return core::DriverStatus::kOk;
}

core::DriverStatus PXIDriver::SetExternalTriggerEdge(core::TriggerEdge edge) {
  triggerEdge_ = edge;
  return core::DriverStatus::kOk;
}

core::DriverStatus PXIDriver::WaitForTrigger(std::uint32_t timeoutMs) {
  (void)timeoutMs;
  if (triggerMode_ == core::TriggerMode::kManual) {
    return core::DriverStatus::kTimeout;
  }
  return core::DriverStatus::kOk;
}

core::DriverStatus PXIDriver::HealthCheck() {
  return initialized_ ? core::DriverStatus::kOk : core::DriverStatus::kInternalError;
}

}  // namespace drivers
}  // namespace vna
