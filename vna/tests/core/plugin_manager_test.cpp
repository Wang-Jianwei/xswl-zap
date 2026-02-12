#include <cassert>
#include <vector>

#include "core/plugin_manager.h"

int main() {
  vna::core::PluginManager manager;

  vna::core::PluginMetadata base;
  base.name = "base";
  assert(manager.RegisterPlugin(base) == vna::core::Status::kOk);

  vna::core::PluginMetadata a;
  a.name = "A";
  a.dependencies.push_back("base");
  assert(manager.RegisterPlugin(a) == vna::core::Status::kOk);

  vna::core::PluginMetadata b;
  b.name = "B";
  b.dependencies.push_back("A");
  assert(manager.RegisterPlugin(b) == vna::core::Status::kOk);

  std::vector<std::string> order;
  assert(manager.ResolveLoadOrder(order) == vna::core::Status::kOk);
  assert(order.size() == 3);
  assert(order[0] == "base");
  assert(order[1] == "A");
  assert(order[2] == "B");

  // Unknown dependency should fail.
  vna::core::PluginManager unknownDep;
  vna::core::PluginMetadata c;
  c.name = "C";
  c.dependencies.push_back("missing");
  assert(unknownDep.RegisterPlugin(c) == vna::core::Status::kOk);
  assert(unknownDep.ResolveLoadOrder(order) == vna::core::Status::kInvalidArgument);

  // Cycle should fail.
  vna::core::PluginManager cycle;
  vna::core::PluginMetadata x;
  x.name = "X";
  x.dependencies.push_back("Y");
  vna::core::PluginMetadata y;
  y.name = "Y";
  y.dependencies.push_back("X");
  assert(cycle.RegisterPlugin(x) == vna::core::Status::kOk);
  assert(cycle.RegisterPlugin(y) == vna::core::Status::kOk);
  assert(cycle.ResolveLoadOrder(order) == vna::core::Status::kInternalError);

  return 0;
}
