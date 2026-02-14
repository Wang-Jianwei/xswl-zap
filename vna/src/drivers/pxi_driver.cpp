#include "drivers/pxi_driver.h"

#include <algorithm>
#include <cmath>

namespace vna {
namespace drivers {

PXIDriver::PXIDriver(const std::string& sessionHandle)
    : sessionHandle_(sessionHandle),
      initialized_(false),
      currentFrequencyHz_(1e9),
      currentPowerDbm_(0.0),
  acquisitionCounter_(0),
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

  const double kTwoPi = 6.283185307179586;
  const double frequencyGhz = currentFrequencyHz_ / 1.0e9;
  const double acquisitionPhase = static_cast<double>(acquisitionCounter_);
  const double baseAmplitude = std::pow(10.0, currentPowerDbm_ / 20.0);
  const double amplitudeRipple =
      1.0 + 0.18 * std::sin(kTwoPi * 0.90 * frequencyGhz + acquisitionPhase * 0.13) +
      0.05 * std::cos(kTwoPi * 2.10 * frequencyGhz);
  const double envelope = std::max(1e-6, baseAmplitude * amplitudeRipple);
  const double cycleCount = 1.1 + 0.45 * std::sin(kTwoPi * 0.42 * frequencyGhz + acquisitionPhase * 0.17);
  const double phaseOffset = kTwoPi * 0.26 * frequencyGhz + acquisitionPhase * 0.12;
  const double dcI = baseAmplitude * 0.05 * std::cos(kTwoPi * 0.37 * frequencyGhz + acquisitionPhase * 0.06);
  const double dcQ = baseAmplitude * 0.04 * std::sin(kTwoPi * 0.41 * frequencyGhz + acquisitionPhase * 0.08);

  for (std::uint32_t index = 0; index < sampleCount; ++index) {
    const double t = static_cast<double>(index) / static_cast<double>(sampleCount);
    const double phase = kTwoPi * cycleCount * t + phaseOffset;
    const double burstModulation = 1.0 + 0.10 * std::sin(kTwoPi * 3.0 * t + kTwoPi * 0.15 * frequencyGhz);
    const double harmonicPhase = phase * 2.8 + 0.65;
    const double i = burstModulation * envelope * std::cos(phase) +
                     0.12 * envelope * std::cos(harmonicPhase) + dcI;
    const double q = burstModulation * envelope * std::sin(phase) +
                     0.12 * envelope * std::sin(harmonicPhase * 0.92) + dcQ;
    samples.push_back(std::complex<double>(i, q));
  }
  acquisitionCounter_ += 1;
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
