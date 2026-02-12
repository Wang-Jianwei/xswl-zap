#pragma once

#include <map>
#include <string>

#include "core/plugin_types.h"
#include "core/status.h"

namespace vna {
namespace core {

class PluginInterface {
 public:
  virtual ~PluginInterface() {}

  virtual PluginMetadata GetMetadata() const = 0;

  // Pre-GA: keep configuration as key/value map.
  virtual Status Initialize(const std::map<std::string, std::string>& config) = 0;
  virtual Status Shutdown() = 0;
  virtual Status HealthCheck() = 0;
};

}  // namespace core
}  // namespace vna
