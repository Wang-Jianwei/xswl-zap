#include <iostream>
#include <vector>

#include "core/built_in_drivers.h"
#include "core/hardware_driver_factory.h"
#include "service/process_manager.h"
#include "service/service_config.h"
#include "service/service_status_service.h"
#include "service/vna_control_service.h"

namespace {
void PrintDriverInfo(const std::string& type, const std::string& id) {
  std::unique_ptr<vna::core::HardwareDriver> driver =
      vna::core::HardwareDriverFactory::CreateDriver(type, id);
  if (!driver) {
    std::cout << "driver create failed: " << type << "\n";
    return;
  }

  const vna::core::DriverStatus initStatus = driver->Initialize();
  if (initStatus != vna::core::DriverStatus::kOk) {
    std::cout << "driver init failed: " << type << "\n";
    return;
  }

  const vna::core::HardwareCapabilities capabilities = driver->GetCapabilities();
  std::cout << "driver=" << type
            << " model=" << driver->GetModel()
            << " pulse=" << (capabilities.supportsPulseExcitation ? "yes" : "no")
            << " multiTone=" << (capabilities.supportsMultiTone ? "yes" : "no")
            << "\n";

  driver->Shutdown();
}

}  // namespace

int main() {
  vna::core::RegisterBuiltInDrivers();
  vna::service::ProcessManager processManager;
  vna::service::ServiceStatusService statusService;
  vna::service::ServiceConfig serviceConfig;
  std::vector<std::string> configErrors;

  const vna::core::Status configStatus =
      vna::service::ServiceConfigLoader::LoadFromFile("config/service.yaml", serviceConfig, configErrors);
  if (configStatus != vna::core::Status::kOk) {
    processManager.SetDegraded("config invalid");
    std::cout << "service config load failed\n";
    for (std::size_t i = 0; i < configErrors.size(); ++i) {
      std::cout << "  - " << configErrors[i] << "\n";
    }
    return 1;
  }
  statusService.UpdateConfig(serviceConfig);

  std::vector<std::string> drivers = vna::core::HardwareDriverFactory::ListRegisteredDrivers();

  std::cout << "xswl-zap vna mock server bootstrap\n";
  std::cout << "config: bind=" << serviceConfig.bindAddress
            << " port=" << serviceConfig.port
            << " tls=" << (serviceConfig.tlsEnabled ? "on" : "off")
            << " log=" << serviceConfig.logLevel
            << "\n";
  std::cout << "registered driver count: " << drivers.size() << "\n";
  for (std::size_t index = 0; index < drivers.size(); ++index) {
    const std::string& type = drivers[index];
    PrintDriverInfo(type, type + "-mock-0");
  }

  // Minimal runtime demo: topology -> instances -> start -> acquire -> stop.
  vna::service::VnaControlService service;
  vna::core::Topology topology;
  topology.id = "demo-topology";
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

  vna::core::Status status = service.ApplyTopology(topology, "ws0", 2);
  if (status != vna::core::Status::kOk) {
    std::cout << "runtime apply topology failed: status=" << static_cast<int>(status) << "\n";
    return 1;
  }

  status = service.Start();
  if (status != vna::core::Status::kOk) {
    std::cout << "runtime start failed: status=" << static_cast<int>(status) << "\n";
    return 1;
  }

  vna::core::ExcitationConfig excitation;
  excitation.mode = vna::core::ExcitationMode::kContinuousWave;
  excitation.cw.frequencyHz = 1.0e9;
  excitation.cw.powerDbm = -10.0;

  vna::core::AcquisitionResult result;
  status = service.AcquireOnce("inst0", excitation, 32, 1000, result);
  if (status != vna::core::Status::kOk) {
    std::cout << "runtime acquire failed: status=" << static_cast<int>(status) << "\n";
    service.Stop();
    return 1;
  }

  service.Stop();
  std::cout << "runtime demo ok: instanceId=" << result.instanceId
            << " timestampNs=" << result.timestampNs
            << "\n";

  processManager.SetReady("mock mode");
  const vna::service::HealthStatus health = processManager.GetHealth();
  statusService.UpdateHealth(health);
  statusService.UpdateRuntimeMetrics(service.InstanceCount(), service.ActiveLeaseCount());

  const vna::service::ServiceStatusSnapshot statusSnapshot = statusService.GetStatus();
  std::cout << "status: " << statusSnapshot.state
            << " (" << statusSnapshot.message << ")"
            << " uptimeMs=" << statusSnapshot.uptimeMs
            << " instances=" << statusSnapshot.instanceCount
            << " activeLeases=" << statusSnapshot.activeLeaseCount
            << "\n";

  return 0;
}
