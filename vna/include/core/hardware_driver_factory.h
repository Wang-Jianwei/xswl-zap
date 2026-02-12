#pragma once

#include <functional>
#include <map>
#include <memory>
#include <string>
#include <vector>

#include "core/hardware_driver.h"

namespace vna {
namespace core {

struct HardwareDeviceInfo {
  std::string driverType;
  std::string deviceIdentifier;
  std::string description;
};

class HardwareDriverFactory {
 public:
  typedef std::function<std::unique_ptr<HardwareDriver>(const std::string&)> DriverCreator;

  static void RegisterDriver(const std::string& type, DriverCreator creator);
  static std::unique_ptr<HardwareDriver> CreateDriver(
      const std::string& type,
      const std::string& deviceIdentifier);

  static std::vector<std::string> ListRegisteredDrivers();

 private:
  static std::map<std::string, DriverCreator>& Registry();
};

}  // namespace core
}  // namespace vna
