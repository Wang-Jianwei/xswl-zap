#include <cassert>
#include <complex>
#include <vector>

#include "drivers/usb_vna_driver.h"

int main() {
  vna::drivers::USBVNADriver invalidDriver("");
  assert(invalidDriver.Initialize() == vna::core::DriverStatus::kInvalidArgument);

  vna::drivers::USBVNADriver driver("usb-mock-0");
  assert(driver.HealthCheck() == vna::core::DriverStatus::kInternalError);
  assert(driver.Initialize() == vna::core::DriverStatus::kOk);
  assert(driver.HealthCheck() == vna::core::DriverStatus::kOk);

  const vna::core::HardwareCapabilities capabilities = driver.GetCapabilities();
  assert(!capabilities.supportsPulseExcitation);
  assert(!capabilities.supportsMultiTone);
  assert(!capabilities.supportsExternalClock);

  assert(driver.SetFrequency(1.0e9) == vna::core::DriverStatus::kOk);
  assert(driver.SetPower(-12.0) == vna::core::DriverStatus::kOk);

  vna::core::PulseConfig pulse;
  pulse.pulseWidthNs = 100;
  pulse.pulsePeriodNs = 1000;
  assert(driver.SetPulseMode(pulse) == vna::core::DriverStatus::kUnsupported);

  std::vector<std::complex<double>> samples;
  assert(driver.AcquireIq(samples, 16) == vna::core::DriverStatus::kOk);
  assert(samples.size() == 16);

  assert(driver.SetTriggerMode(vna::core::TriggerMode::kInternal) == vna::core::DriverStatus::kOk);
  assert(driver.WaitForTrigger(100) == vna::core::DriverStatus::kOk);
  assert(driver.SetTriggerMode(vna::core::TriggerMode::kExternal) == vna::core::DriverStatus::kOk);
  assert(driver.WaitForTrigger(100) == vna::core::DriverStatus::kUnsupported);
  assert(driver.SetExternalTriggerEdge(vna::core::TriggerEdge::kRising) == vna::core::DriverStatus::kUnsupported);

  assert(driver.Shutdown() == vna::core::DriverStatus::kOk);
  assert(driver.HealthCheck() == vna::core::DriverStatus::kInternalError);
  return 0;
}
