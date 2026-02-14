#include "drivers/usb_vna_driver.h"

#include <algorithm>
#include <cmath>

namespace vna {
namespace drivers {

USBVNADriver::USBVNADriver(const std::string& devicePath)
    : devicePath_(devicePath),
      initialized_(false),
      currentFrequencyHz_(1e9),
      currentPowerDbm_(-10.0),
  acquisitionCounter_(0),
      triggerMode_(core::TriggerMode::kInternal),
      triggerEdge_(core::TriggerEdge::kRising) {}

core::DriverStatus USBVNADriver::Initialize() {
  if (devicePath_.empty()) {
    return core::DriverStatus::kInvalidArgument;
  }
  initialized_ = true;
  return core::DriverStatus::kOk;
}

core::DriverStatus USBVNADriver::Shutdown() {
  initialized_ = false;
  return core::DriverStatus::kOk;
}

std::string USBVNADriver::GetModel() const {
  return "USB-MOCK-VNA";
}

std::string USBVNADriver::GetSerialNumber() const {
  return devicePath_;
}

core::HardwareCapabilities USBVNADriver::GetCapabilities() const {
  core::HardwareCapabilities capabilities;
  capabilities.supportsPulseExcitation = false;
  capabilities.supportsMultiTone = false;
  capabilities.supportsExternalClock = false;
  capabilities.minPulseWidthNs = 0;
  capabilities.minPulsePeriodNs = 0;
  capabilities.maxSamplingRateGhz = 0.5;
  return capabilities;
}

core::DriverStatus USBVNADriver::SetFrequency(double frequencyHz) {
  if (!initialized_ || frequencyHz <= 0.0) {
    return core::DriverStatus::kInvalidArgument;
  }
  currentFrequencyHz_ = frequencyHz;
  return core::DriverStatus::kOk;
}

core::DriverStatus USBVNADriver::SetPower(double powerDbm) {
  if (!initialized_) {
    return core::DriverStatus::kInternalError;
  }
  currentPowerDbm_ = powerDbm;
  return core::DriverStatus::kOk;
}

core::DriverStatus USBVNADriver::AcquireIq(std::vector<std::complex<double>>& samples,
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
  const double amplitudeRipple = 1.0 + 0.10 * std::sin(kTwoPi * 0.65 * frequencyGhz + acquisitionPhase * 0.07);
  const double envelope = std::max(1e-6, baseAmplitude * amplitudeRipple);
  const double cycleCount = 0.9 + 0.35 * (0.5 + 0.5 * std::sin(kTwoPi * 0.31 * frequencyGhz + acquisitionPhase * 0.11));
  const double phaseOffset = kTwoPi * 0.18 * frequencyGhz + acquisitionPhase * 0.09;
  const double dcI = baseAmplitude * 0.03 * std::cos(kTwoPi * 0.22 * frequencyGhz + acquisitionPhase * 0.05);
  const double dcQ = baseAmplitude * 0.02 * std::sin(kTwoPi * 0.28 * frequencyGhz + acquisitionPhase * 0.04);

  for (std::uint32_t index = 0; index < sampleCount; ++index) {
    const double t = static_cast<double>(index) / static_cast<double>(sampleCount);
    const double phase = kTwoPi * cycleCount * t + phaseOffset;
    const double harmonicPhase = phase * 2.4 + 0.4;
    const double i = envelope * std::cos(phase) + 0.08 * envelope * std::cos(harmonicPhase) + dcI;
    const double q = envelope * std::sin(phase) + 0.08 * envelope * std::sin(harmonicPhase * 0.9) + dcQ;
    samples.push_back(std::complex<double>(i, q));
  }
  acquisitionCounter_ += 1;
  return core::DriverStatus::kOk;
}

core::DriverStatus USBVNADriver::SetTriggerMode(core::TriggerMode mode) {
  triggerMode_ = mode;
  return core::DriverStatus::kOk;
}

core::DriverStatus USBVNADriver::SetExternalTriggerEdge(core::TriggerEdge edge) {
  triggerEdge_ = edge;
  return core::DriverStatus::kUnsupported;
}

core::DriverStatus USBVNADriver::WaitForTrigger(std::uint32_t timeoutMs) {
  (void)timeoutMs;
  return triggerMode_ == core::TriggerMode::kInternal ? core::DriverStatus::kOk
                                                      : core::DriverStatus::kUnsupported;
}

core::DriverStatus USBVNADriver::HealthCheck() {
  return initialized_ ? core::DriverStatus::kOk : core::DriverStatus::kInternalError;
}

}  // namespace drivers
}  // namespace vna
