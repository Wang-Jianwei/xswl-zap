#pragma once

#include <functional>
#include <map>
#include <memory>
#include <string>

#include "core/plugin_interface.h"

namespace vna {
namespace core {

class PluginRegistry {
 public:
  typedef std::function<std::unique_ptr<PluginInterface>()> PluginCreator;

  static void Register(const std::string& name, PluginCreator creator);
  static std::unique_ptr<PluginInterface> Create(const std::string& name);

 private:
  static std::map<std::string, PluginCreator>& Registry();
};

}  // namespace core
}  // namespace vna
