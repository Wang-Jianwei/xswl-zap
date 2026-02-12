#include "drivers/usb_vna_driver.h"

#include <cmath>

namespace vna {
namespace drivers {

USBVNADriver::USBVNADriver(const std::string& devicePath)
    : devicePath_(devicePath),
      initialized_(false),
      currentFrequencyHz_(1e9),
      currentPowerDbm_(-10.0),
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

  const double amplitude = std::pow(10.0, currentPowerDbm_ / 20.0);
  for (std::uint32_t index = 0; index < sampleCount; ++index) {
    const double phase = (2.0 * 3.141592653589793 * static_cast<double>(index)) /
                         static_cast<double>(sampleCount);
    samples.push_back(std::complex<double>(amplitude * std::cos(phase), amplitude * std::sin(phase)));
  }
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
