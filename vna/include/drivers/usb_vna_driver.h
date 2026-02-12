#pragma once

#include <string>

#include "core/hardware_driver.h"

namespace vna {
namespace drivers {

class USBVNADriver : public core::HardwareDriver {
 public:
  explicit USBVNADriver(const std::string& devicePath);
  ~USBVNADriver() override {}

  core::DriverStatus Initialize() override;
  core::DriverStatus Shutdown() override;

  std::string GetModel() const override;
  std::string GetSerialNumber() const override;
  core::HardwareCapabilities GetCapabilities() const override;

  core::DriverStatus SetFrequency(double frequencyHz) override;
  core::DriverStatus SetPower(double powerDbm) override;

  core::DriverStatus AcquireIq(std::vector<std::complex<double>>& samples,
                               std::uint32_t sampleCount) override;

  core::DriverStatus SetTriggerMode(core::TriggerMode mode) override;
  core::DriverStatus SetExternalTriggerEdge(core::TriggerEdge edge) override;
  core::DriverStatus WaitForTrigger(std::uint32_t timeoutMs) override;
  core::DriverStatus HealthCheck() override;

 private:
  std::string devicePath_;
  bool initialized_;
  double currentFrequencyHz_;
  double currentPowerDbm_;
  core::TriggerMode triggerMode_;
  core::TriggerEdge triggerEdge_;
};

}  // namespace drivers
}  // namespace vna
