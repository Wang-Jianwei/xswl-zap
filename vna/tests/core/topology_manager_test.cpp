#include <cassert>
#include <string>

#include "core/topology_manager.h"

int main() {
  vna::core::TopologyManager manager;

  {
    vna::core::Topology topology;
    topology.id = "t0";
    topology.yaml = "";

    const vna::core::ValidationResult result = manager.ValidateTopology(topology);
    assert(!result.ok);
    assert(!result.errors.empty());
  }

  {
    vna::core::Topology topology;
    topology.id = "";
    topology.yaml = "instances:\n  - id: inst0\n";

    const vna::core::ValidationResult result = manager.ValidateTopology(topology);
    assert(!result.ok);
  }

  {
    vna::core::Topology topology;
    topology.id = "t1";
    topology.yaml = "instances:\n  - id: inst0\n    device: pxi\n";

    const vna::core::ValidationResult result = manager.ValidateTopology(topology);
    assert(result.ok);
    assert(result.errors.empty());
  }

  {
    vna::core::Topology topology;
    topology.id = "t2";
    topology.yaml = "instances:\n\t- id: inst0\n";

    const vna::core::ValidationResult result = manager.ValidateTopology(topology);
    assert(!result.ok);
  }

  return 0;
}
