#include <cassert>

#include "core/built_in_drivers.h"
#include "core/excitation_mode.h"
#include "core/measurement_data.h"
#include "service/process_manager.h"
#include "service/resource_broker_service.h"
#include "service/service_config.h"
#include "service/vna_control_service.h"

int main() {
  vna::core::RegisterBuiltInDrivers();

  // Step 1: load service config.
  vna::service::ServiceConfig config;
  std::vector<std::string> configErrors;
  assert(vna::service::ServiceConfigLoader::LoadFromFile("config/service.yaml", config, configErrors) ==
         vna::core::Status::kOk);
  assert(configErrors.empty());
  assert(config.port > 0);

  // Step 2: process health and service startup path.
  vna::service::ProcessManager processManager;
  processManager.SetReady("integration");
  const vna::service::HealthStatus health = processManager.GetHealth();
  assert(health.ready);
  assert(health.state == "ready");

  // Step 3: topology apply/start/acquire/stop flow.
  vna::service::VnaControlService controlService;

  vna::core::Topology topology;
  topology.id = "it-topology";
  topology.yaml =
      "instances:\n"
      "  - id: inst0\n"
      "    driver: pxi\n"
      "    device: pxi-mock-0\n"
      "    resource: dev0\n";

  assert(controlService.ApplyTopology(topology, "ws-it", 2) == vna::core::Status::kOk);
  assert(controlService.Start() == vna::core::Status::kOk);

  vna::core::ExcitationConfig excitation;
  excitation.mode = vna::core::ExcitationMode::kContinuousWave;
  excitation.cw.frequencyHz = 2.0e9;
  excitation.cw.powerDbm = -5.0;

  vna::core::AcquisitionResult result;
  assert(controlService.AcquireOnce("inst0", excitation, 16, 1000, result) == vna::core::Status::kOk);
  assert(result.instanceId == "inst0");
  assert(controlService.Stop() == vna::core::Status::kOk);

  // Step 4: resource broker conflict path.
  vna::service::ResourceBrokerService broker;

  vna::core::ResourceRequest req;
  req.resourceId = "dev-it";
  req.workspaceId = "ws-it";
  req.exclusive = true;
  req.timeoutMs = 10;

  vna::core::LeaseInfo lease;
  assert(broker.Acquire(req, 1, lease) == vna::core::Status::kOk);

  vna::core::LeaseInfo lease2;
  assert(broker.Acquire(req, 1, lease2) == vna::core::Status::kTimeout);
  assert(broker.Release(lease) == vna::core::Status::kOk);

  return 0;
}
