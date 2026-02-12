#pragma once

#include <map>
#include <memory>
#include <string>
#include <vector>

#include "core/plugin_interface.h"
#include "core/plugin_types.h"
#include "core/status.h"

namespace vna {
namespace core {

class PluginManager {
 public:
  // Register plugin metadata. Pre-GA: no dynamic loading yet.
  Status RegisterPlugin(const PluginMetadata& metadata);

  // Returns false if not found.
  bool GetPlugin(const std::string& name, PluginMetadata& out) const;

  // Resolve dependency order (topological sort).
  // Returns Status::kOk and fills loadOrder on success.
  // Returns Status::kInvalidArgument if dependencies reference unknown plugins.
  // Returns Status::kInternalError if cycles are detected.
  Status ResolveLoadOrder(std::vector<std::string>& loadOrder) const;

  // ---- Lifecycle (Pre-GA minimal) ----
  // Creates and initializes plugins in resolved order.
  Status InitializeAll(const std::map<std::string, std::string>& config);
  // Calls HealthCheck on all active plugins.
  Status HealthCheckAll();
  // Shuts down plugins in reverse load order.
  Status ShutdownAll();

  std::size_t PluginCount() const;
  std::size_t ActivePluginCount() const;

 private:
  struct NodeState {
    enum Value {
      kUnvisited = 0,
      kVisiting = 1,
      kVisited = 2,
    };
  };

  Status Visit(const std::string& name,
               std::map<std::string, int>& state,
               std::vector<std::string>& loadOrder) const;

  std::map<std::string, PluginMetadata> pluginsByName_;
  std::vector<std::string> activeLoadOrder_;
  std::map<std::string, std::unique_ptr<PluginInterface>> activePlugins_;
};

}  // namespace core
}  // namespace vna
