#include <cassert>
#include <memory>

#include "core/built_in_drivers.h"
#include "core/hardware_driver_factory.h"

int main() {
  vna::core::RegisterBuiltInDrivers();

  std::unique_ptr<vna::core::HardwareDriver> pxi =
      vna::core::HardwareDriverFactory::CreateDriver("pxi", "pxi-mock-0");
  assert(pxi);
  assert(pxi->Initialize() == vna::core::DriverStatus::kOk);
  pxi->Shutdown();

  std::unique_ptr<vna::core::HardwareDriver> usb =
      vna::core::HardwareDriverFactory::CreateDriver("usb", "usb-mock-0");
  assert(usb);
  assert(usb->Initialize() == vna::core::DriverStatus::kOk);
  usb->Shutdown();

  std::unique_ptr<vna::core::HardwareDriver> unknown =
      vna::core::HardwareDriverFactory::CreateDriver("unknown", "x");
  assert(!unknown);

  return 0;
}
