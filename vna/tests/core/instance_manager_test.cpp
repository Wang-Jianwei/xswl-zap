#include <cassert>
#include <memory>

#include "core/built_in_drivers.h"
#include "core/instance_manager.h"

int main() {
  vna::core::RegisterBuiltInDrivers();

  vna::core::ResourceManager resourceManager;
  vna::core::InstanceManager instanceManager(&resourceManager);

  vna::core::InstanceConfig config;
  config.instanceId = "inst0";
  config.workspaceId = "ws0";
  config.driverType = "pxi";
  config.deviceIdentifier = "pxi-mock-0";
  config.resourceId = "dev0";
  config.leaseTtlSeconds = 2;

  assert(instanceManager.CreateInstance(config) == vna::core::Status::kOk);
  assert(instanceManager.StartInstance("inst0") == vna::core::Status::kOk);
  assert(resourceManager.ActiveLeaseCount() == 1);

  vna::core::ExcitationConfig excitation;
  excitation.mode = vna::core::ExcitationMode::kContinuousWave;
  excitation.cw.frequencyHz = 2.0e9;
  excitation.cw.powerDbm = -3.0;

  vna::core::AcquisitionResult result;
  assert(instanceManager.AcquireOnce("inst0", excitation, 64, 1000, result) == vna::core::Status::kOk);
  assert(result.instanceId == "inst0");

  // Contention scenario.
  vna::core::InstanceConfig config2 = config;
  config2.instanceId = "inst1";
  assert(instanceManager.CreateInstance(config2) == vna::core::Status::kOk);
  assert(instanceManager.StartInstance("inst1") != vna::core::Status::kOk);

  assert(instanceManager.StopInstance("inst0") == vna::core::Status::kOk);
  assert(resourceManager.ActiveLeaseCount() == 0);

  // Now inst1 can start.
  assert(instanceManager.StartInstance("inst1") == vna::core::Status::kOk);
  assert(resourceManager.ActiveLeaseCount() == 1);
  assert(instanceManager.StopInstance("inst1") == vna::core::Status::kOk);

  return 0;
}
