#include "core/plugin_registry.h"

namespace vna {
namespace core {

std::map<std::string, PluginRegistry::PluginCreator>& PluginRegistry::Registry() {
  static std::map<std::string, PluginCreator> registry;
  return registry;
}

void PluginRegistry::Register(const std::string& name, PluginCreator creator) {
  if (name.empty() || !creator) {
    return;
  }
  Registry()[name] = creator;
}

std::unique_ptr<PluginInterface> PluginRegistry::Create(const std::string& name) {
  const std::map<std::string, PluginCreator>& registry = Registry();
  const std::map<std::string, PluginCreator>::const_iterator it = registry.find(name);
  if (it == registry.end()) {
    return std::unique_ptr<PluginInterface>();
  }
  return it->second();
}

}  // namespace core
}  // namespace vna
