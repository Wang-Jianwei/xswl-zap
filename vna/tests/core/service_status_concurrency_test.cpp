#include <atomic>
#include <cassert>
#include <string>
#include <thread>

#include "service/process_manager.h"
#include "service/service_status_service.h"

int main() {
  vna::service::ProcessManager processManager;
  vna::service::ServiceStatusService statusService;

  std::atomic<bool> done(false);

  std::thread writer([&]() {
    for (int i = 0; i < 5000; ++i) {
      if ((i % 2) == 0) {
        processManager.SetReady("ready-loop");
      } else {
        processManager.SetDegraded("degraded-loop");
      }

      vna::service::HealthStatus health = processManager.GetHealth();
      statusService.UpdateHealth(health);

      vna::service::ServiceConfig config;
      config.bindAddress = "127.0.0.1";
      config.port = static_cast<std::uint32_t>(50051 + (i % 3));
      config.tlsEnabled = false;
      config.logLevel = "info";
      statusService.UpdateConfig(config);

      statusService.UpdateRuntimeMetrics(static_cast<std::size_t>(i % 4), static_cast<std::size_t>(i % 2));
    }
    done.store(true);
  });

  std::thread reader([&]() {
    while (!done.load()) {
      const vna::service::HealthStatus health = processManager.GetHealth();
      assert(health.state == "ready" || health.state == "degraded");
      assert(!health.message.empty());

      const vna::service::ServiceStatusSnapshot snapshot = statusService.GetStatus();
      assert(snapshot.state == "ready" || snapshot.state == "degraded");
      assert(snapshot.port >= 50051 && snapshot.port <= 50053);
    }
  });

  writer.join();
  reader.join();

  return 0;
}