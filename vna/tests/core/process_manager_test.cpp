#include <cassert>
#include <thread>

#include "service/process_manager.h"

int main() {
  vna::service::ProcessManager manager;

  {
    const vna::service::HealthStatus health = manager.GetHealth();
    assert(!health.ready);
    assert(health.state == "degraded");
    assert(health.message == "booting");
  }

  std::this_thread::sleep_for(std::chrono::milliseconds(5));

  {
    const vna::service::HealthStatus health = manager.GetHealth();
    assert(health.uptimeMs > 0);
  }

  manager.SetReady("mock mode");
  {
    const vna::service::HealthStatus health = manager.GetHealth();
    assert(health.ready);
    assert(health.state == "ready");
    assert(health.message == "mock mode");
  }

  manager.SetDegraded("resource warming");
  {
    const vna::service::HealthStatus health = manager.GetHealth();
    assert(!health.ready);
    assert(health.state == "degraded");
    assert(health.message == "resource warming");
  }

  return 0;
}
