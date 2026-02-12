#include <cassert>

#include "core/built_in_drivers.h"
#include "core/instance_manager.h"

int main() {
  vna::core::RegisterBuiltInDrivers();

  vna::core::ResourceManager resourceManager;
  vna::core::InstanceManager instanceManager(&resourceManager);

  vna::core::Topology topology;
  topology.id = "topo0";
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

  assert(instanceManager.CreateInstancesFromTopology(topology, "ws0", 2) == vna::core::Status::kOk);
  assert(instanceManager.InstanceCount() == 2);

  // Start and acquire on inst0.
  assert(instanceManager.StartInstance("inst0") == vna::core::Status::kOk);

  vna::core::ExcitationConfig excitation;
  excitation.mode = vna::core::ExcitationMode::kContinuousWave;
  excitation.cw.frequencyHz = 1.0e9;
  excitation.cw.powerDbm = -10.0;

  vna::core::AcquisitionResult result;
  assert(instanceManager.AcquireOnce("inst0", excitation, 32, 1000, result) == vna::core::Status::kOk);
  assert(result.instanceId == "inst0");

  assert(instanceManager.StopInstance("inst0") == vna::core::Status::kOk);

  // Ensure inst1 can start (different resource id).
  assert(instanceManager.StartInstance("inst1") == vna::core::Status::kOk);
  assert(instanceManager.StopInstance("inst1") == vna::core::Status::kOk);

  return 0;
}
