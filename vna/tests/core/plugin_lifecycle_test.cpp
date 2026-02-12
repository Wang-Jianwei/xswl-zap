#include <cassert>
#include <map>
#include <memory>
#include <string>
#include <vector>

#include "core/plugin_manager.h"
#include "core/plugin_registry.h"

namespace {

class FakePlugin : public vna::core::PluginInterface {
 public:
  explicit FakePlugin(const std::string& name, const std::vector<std::string>& deps)
      : name_(name), deps_(deps), initCount_(0), shutdownCount_(0) {}

  vna::core::PluginMetadata GetMetadata() const override {
    vna::core::PluginMetadata meta;
    meta.name = name_;
    meta.version = "0";
    meta.dependencies = deps_;
    return meta;
  }

  vna::core::Status Initialize(const std::map<std::string, std::string>& config) override {
    (void)config;
    ++initCount_;
    return vna::core::Status::kOk;
  }

  vna::core::Status Shutdown() override {
    ++shutdownCount_;
    return vna::core::Status::kOk;
  }

  vna::core::Status HealthCheck() override {
    return vna::core::Status::kOk;
  }

  int InitCount() const { return initCount_; }
  int ShutdownCount() const { return shutdownCount_; }

 private:
  std::string name_;
  std::vector<std::string> deps_;
  int initCount_;
  int shutdownCount_;
};

}  // namespace

int main() {
  // Register plugin constructors.
  vna::core::PluginRegistry::Register(
      "base",
      []() -> std::unique_ptr<vna::core::PluginInterface> {
        return std::unique_ptr<vna::core::PluginInterface>(new FakePlugin("base", {}));
      });

  vna::core::PluginRegistry::Register(
      "A",
      []() -> std::unique_ptr<vna::core::PluginInterface> {
        return std::unique_ptr<vna::core::PluginInterface>(new FakePlugin("A", {"base"}));
      });

  vna::core::PluginManager manager;

  // Register metadata first (as if discovered).
  {
    vna::core::PluginMetadata base;
    base.name = "base";
    manager.RegisterPlugin(base);

    vna::core::PluginMetadata a;
    a.name = "A";
    a.dependencies.push_back("base");
    manager.RegisterPlugin(a);
  }

  // Resolve load order should be base then A.
  std::vector<std::string> order;
  assert(manager.ResolveLoadOrder(order) == vna::core::Status::kOk);
  assert(order.size() == 2);
  assert(order[0] == "base");
  assert(order[1] == "A");

  // Lifecycle APIs are exercised in PluginManager tests indirectly; this test validates registry.
  std::unique_ptr<vna::core::PluginInterface> created = vna::core::PluginRegistry::Create("A");
  assert(created);
  assert(created->GetMetadata().name == "A");

  std::map<std::string, std::string> emptyConfig;
  assert(created->Initialize(emptyConfig) == vna::core::Status::kOk);
  assert(created->HealthCheck() == vna::core::Status::kOk);
  assert(created->Shutdown() == vna::core::Status::kOk);

  return 0;
}
