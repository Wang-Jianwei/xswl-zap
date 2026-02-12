#include "core/hardware_driver_factory.h"

namespace vna {
namespace core {

std::map<std::string, HardwareDriverFactory::DriverCreator>& HardwareDriverFactory::Registry() {
  static std::map<std::string, DriverCreator> registry;
  return registry;
}

void HardwareDriverFactory::RegisterDriver(const std::string& type, DriverCreator creator) {
  if (type.empty() || !creator) {
    return;
  }
  Registry()[type] = creator;
}

std::unique_ptr<HardwareDriver> HardwareDriverFactory::CreateDriver(
    const std::string& type,
    const std::string& deviceIdentifier) {
  std::map<std::string, DriverCreator>& registry = Registry();
  std::map<std::string, DriverCreator>::const_iterator it = registry.find(type);
  if (it == registry.end()) {
    return std::unique_ptr<HardwareDriver>();
  }
  return it->second(deviceIdentifier);
}

std::vector<std::string> HardwareDriverFactory::ListRegisteredDrivers() {
  std::vector<std::string> driverTypes;
  const std::map<std::string, DriverCreator>& registry = Registry();
  for (std::map<std::string, DriverCreator>::const_iterator it = registry.begin();
       it != registry.end();
       ++it) {
    driverTypes.push_back(it->first);
  }
  return driverTypes;
}

}  // namespace core
}  // namespace vna
