#include "core/built_in_drivers.h"

#include <memory>
#include <string>

#include "core/hardware_driver_factory.h"
#include "drivers/pxi_driver.h"
#include "drivers/usb_vna_driver.h"

namespace vna {
namespace core {

void RegisterBuiltInDrivers() {
  HardwareDriverFactory::RegisterDriver(
      "pxi",
      [](const std::string& deviceIdentifier) -> std::unique_ptr<HardwareDriver> {
        return std::unique_ptr<HardwareDriver>(new drivers::PXIDriver(deviceIdentifier));
      });

  HardwareDriverFactory::RegisterDriver(
      "usb",
      [](const std::string& deviceIdentifier) -> std::unique_ptr<HardwareDriver> {
        return std::unique_ptr<HardwareDriver>(new drivers::USBVNADriver(deviceIdentifier));
      });
}

}  // namespace core
}  // namespace vna
