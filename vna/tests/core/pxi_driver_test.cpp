#include <cassert>
#include <complex>
#include <vector>

#include "drivers/pxi_driver.h"

int main() {
  vna::drivers::PXIDriver invalidDriver("");
  assert(invalidDriver.Initialize() == vna::core::DriverStatus::kInvalidArgument);

  vna::drivers::PXIDriver driver("pxi-mock-0");
  assert(driver.HealthCheck() == vna::core::DriverStatus::kInternalError);
  assert(driver.Initialize() == vna::core::DriverStatus::kOk);
  assert(driver.HealthCheck() == vna::core::DriverStatus::kOk);

  const vna::core::HardwareCapabilities capabilities = driver.GetCapabilities();
  assert(capabilities.supportsPulseExcitation);
  assert(capabilities.supportsMultiTone);
  assert(capabilities.supportsExternalClock);

  assert(driver.SetFrequency(2.4e9) == vna::core::DriverStatus::kOk);
  assert(driver.SetPower(-3.0) == vna::core::DriverStatus::kOk);

  vna::core::PulseConfig invalidPulse;
  invalidPulse.pulseWidthNs = 100;
  invalidPulse.pulsePeriodNs = 100;
  assert(driver.SetPulseMode(invalidPulse) == vna::core::DriverStatus::kInvalidArgument);

  vna::core::PulseConfig validPulse;
  validPulse.pulseWidthNs = 100;
  validPulse.pulsePeriodNs = 1000;
  validPulse.riseTimeNs = 10;
  validPulse.centerFrequencyHz = 2.4e9;
  validPulse.powerDbm = -3.0;
  assert(driver.SetPulseMode(validPulse) == vna::core::DriverStatus::kOk);

  std::vector<std::complex<double>> samples;
  assert(driver.AcquireIq(samples, 32) == vna::core::DriverStatus::kOk);
  assert(samples.size() == 32);

  assert(driver.SetTriggerMode(vna::core::TriggerMode::kManual) == vna::core::DriverStatus::kOk);
  assert(driver.WaitForTrigger(100) == vna::core::DriverStatus::kTimeout);
  assert(driver.SetTriggerMode(vna::core::TriggerMode::kInternal) == vna::core::DriverStatus::kOk);
  assert(driver.WaitForTrigger(100) == vna::core::DriverStatus::kOk);
  assert(driver.SetExternalTriggerEdge(vna::core::TriggerEdge::kFalling) == vna::core::DriverStatus::kOk);

  assert(driver.Shutdown() == vna::core::DriverStatus::kOk);
  assert(driver.HealthCheck() == vna::core::DriverStatus::kInternalError);
  return 0;
}
