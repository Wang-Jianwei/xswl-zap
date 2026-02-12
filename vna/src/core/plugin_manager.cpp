#include "core/plugin_manager.h"

#include "core/plugin_registry.h"

namespace vna {
namespace core {

Status PluginManager::RegisterPlugin(const PluginMetadata& metadata) {
  if (metadata.name.empty()) {
    return Status::kInvalidArgument;
  }
  pluginsByName_[metadata.name] = metadata;
  return Status::kOk;
}

bool PluginManager::GetPlugin(const std::string& name, PluginMetadata& out) const {
  const std::map<std::string, PluginMetadata>::const_iterator it = pluginsByName_.find(name);
  if (it == pluginsByName_.end()) {
    return false;
  }
  out = it->second;
  return true;
}

std::size_t PluginManager::PluginCount() const {
  return pluginsByName_.size();
}

std::size_t PluginManager::ActivePluginCount() const {
  return activePlugins_.size();
}

Status PluginManager::Visit(const std::string& name,
                            std::map<std::string, int>& state,
                            std::vector<std::string>& loadOrder) const {
  const std::map<std::string, PluginMetadata>::const_iterator it = pluginsByName_.find(name);
  if (it == pluginsByName_.end()) {
    return Status::kInvalidArgument;
  }

  const int curState = state[name];
  if (curState == NodeState::kVisiting) {
    return Status::kInternalError;  // cycle detected
  }
  if (curState == NodeState::kVisited) {
    return Status::kOk;
  }

  state[name] = NodeState::kVisiting;

  const PluginMetadata& meta = it->second;
  for (std::size_t i = 0; i < meta.dependencies.size(); ++i) {
    const std::string& dep = meta.dependencies[i];
    if (pluginsByName_.find(dep) == pluginsByName_.end()) {
      return Status::kInvalidArgument;
    }

    const Status depStatus = Visit(dep, state, loadOrder);
    if (depStatus != Status::kOk) {
      return depStatus;
    }
  }

  state[name] = NodeState::kVisited;
  loadOrder.push_back(name);
  return Status::kOk;
}

Status PluginManager::ResolveLoadOrder(std::vector<std::string>& loadOrder) const {
  loadOrder.clear();

  std::map<std::string, int> state;
  for (std::map<std::string, PluginMetadata>::const_iterator it = pluginsByName_.begin();
       it != pluginsByName_.end();
       ++it) {
    state[it->first] = NodeState::kUnvisited;
  }

  for (std::map<std::string, PluginMetadata>::const_iterator it = pluginsByName_.begin();
       it != pluginsByName_.end();
       ++it) {
    if (state[it->first] != NodeState::kUnvisited) {
      continue;
    }

    const Status status = Visit(it->first, state, loadOrder);
    if (status != Status::kOk) {
      loadOrder.clear();
      return status;
    }
  }

  return Status::kOk;
}

Status PluginManager::InitializeAll(const std::map<std::string, std::string>& config) {
  if (!activePlugins_.empty()) {
    return Status::kInternalError;
  }

  std::vector<std::string> order;
  const Status resolveStatus = ResolveLoadOrder(order);
  if (resolveStatus != Status::kOk) {
    return resolveStatus;
  }

  for (std::size_t i = 0; i < order.size(); ++i) {
    const std::string& name = order[i];
    std::unique_ptr<PluginInterface> plugin = PluginRegistry::Create(name);
    if (!plugin) {
      // Pre-GA: treat missing creator as configuration error.
      ShutdownAll();
      return Status::kInvalidArgument;
    }

    const Status initStatus = plugin->Initialize(config);
    if (initStatus != Status::kOk) {
      ShutdownAll();
      return initStatus;
    }

    activePlugins_[name] = std::move(plugin);
    activeLoadOrder_.push_back(name);
  }

  return Status::kOk;
}

Status PluginManager::HealthCheckAll() {
  for (std::map<std::string, std::unique_ptr<PluginInterface>>::iterator it = activePlugins_.begin();
       it != activePlugins_.end();
       ++it) {
    if (!it->second) {
      return Status::kInternalError;
    }
    const Status status = it->second->HealthCheck();
    if (status != Status::kOk) {
      return status;
    }
  }
  return Status::kOk;
}

Status PluginManager::ShutdownAll() {
  // Shutdown in reverse initialization order.
  for (std::size_t i = activeLoadOrder_.size(); i > 0; --i) {
    const std::string& name = activeLoadOrder_[i - 1];
    std::map<std::string, std::unique_ptr<PluginInterface>>::iterator it = activePlugins_.find(name);
    if (it == activePlugins_.end() || !it->second) {
      continue;
    }
    it->second->Shutdown();
  }

  activePlugins_.clear();
  activeLoadOrder_.clear();
  return Status::kOk;
}

}  // namespace core
}  // namespace vna
