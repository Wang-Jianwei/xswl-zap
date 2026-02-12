#include <cassert>

#include "core/built_in_drivers.h"
#include "core/vna_runtime.h"

int main() {
  vna::core::RegisterBuiltInDrivers();

  vna::core::VnaRuntime runtime;

  vna::core::Topology topology;
  topology.id = "topo_runtime_0";
  topology.yaml =
      "instances:\n"
      "  - id: inst0\n"
      "    driver: pxi\n"
      "    device: pxi-mock-0\n"
      "    resource: dev0\n"
      "  - id: inst1\n"
      "    driver: usb\n"
      "    device: usb-mock-0\n"
      "    resource: dev1\n";

  assert(runtime.ApplyTopology(topology, "ws0", 2) == vna::core::Status::kOk);
  assert(runtime.InstanceCount() == 2);

  assert(runtime.StartAll() == vna::core::Status::kOk);
  assert(runtime.ActiveLeaseCount() == 2);

  vna::core::ExcitationConfig excitation;
  excitation.mode = vna::core::ExcitationMode::kContinuousWave;
  excitation.cw.frequencyHz = 1.0e9;
  excitation.cw.powerDbm = -10.0;

  vna::core::AcquisitionResult result;
  assert(runtime.AcquireOnce("inst0", excitation, 32, 1000, result) == vna::core::Status::kOk);
  assert(result.instanceId == "inst0");

  assert(runtime.StopAll() == vna::core::Status::kOk);
  assert(runtime.ActiveLeaseCount() == 0);

  // ---- Failure paths ----
  // Resource contention: two instances share same resource id.
  {
    vna::core::VnaRuntime conflictRuntime;

    vna::core::Topology conflict;
    conflict.id = "topo_conflict_0";
    conflict.yaml =
        "instances:\n"
        "  - id: inst0\n"
        "    driver: pxi\n"
        "    device: pxi-mock-0\n"
        "    resource: dev0\n"
        "  - id: inst1\n"
        "    driver: usb\n"
        "    device: usb-mock-0\n"
        "    resource: dev0\n";

    assert(conflictRuntime.ApplyTopology(conflict, "ws0", 2) == vna::core::Status::kOk);
    assert(conflictRuntime.InstanceCount() == 2);

    // StartAll must fail and rollback started instances (no lease leak).
    assert(conflictRuntime.StartAll() != vna::core::Status::kOk);
    assert(conflictRuntime.ActiveLeaseCount() == 0);
    assert(conflictRuntime.StopAll() == vna::core::Status::kOk);
    assert(conflictRuntime.ActiveLeaseCount() == 0);
  }

  // Duplicate instance ids should be rejected.
  {
    vna::core::VnaRuntime dupRuntime;
    vna::core::Topology dup;
    dup.id = "topo_dup_0";
    dup.yaml =
        "instances:\n"
        "  - id: inst0\n"
        "    driver: pxi\n"
        "    device: pxi-mock-0\n"
        "    resource: dev0\n"
        "  - id: inst0\n"
        "    driver: usb\n"
        "    device: usb-mock-0\n"
        "    resource: dev1\n";

    assert(dupRuntime.ApplyTopology(dup, "ws0", 2) == vna::core::Status::kInvalidArgument);
    assert(dupRuntime.InstanceCount() == 0);
  }

  // Missing required fields should be rejected.
  {
    vna::core::VnaRuntime missingRuntime;
    vna::core::Topology missing;
    missing.id = "topo_missing_0";
    missing.yaml =
        "instances:\n"
        "  - id: inst0\n"
        "    device: pxi-mock-0\n"
        "    resource: dev0\n";
    assert(missingRuntime.ApplyTopology(missing, "ws0", 2) == vna::core::Status::kInvalidArgument);
    assert(missingRuntime.InstanceCount() == 0);
  }

  return 0;
}
