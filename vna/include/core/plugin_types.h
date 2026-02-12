#pragma once

#include <map>
#include <string>
#include <vector>

namespace vna {
namespace core {

struct PluginMetadata {
  std::string name;
  std::string version;
  std::string description;

  // Names of plugins that must be loaded before this one.
  std::vector<std::string> dependencies;

  // Optional configuration schema placeholder (Pre-GA: keep simple).
  std::map<std::string, std::string> configSchema;
};

}  // namespace core
}  // namespace vna
