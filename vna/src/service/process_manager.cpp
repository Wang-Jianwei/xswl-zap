#include "service/process_manager.h"

#include <chrono>

namespace vna {
namespace service {

namespace {

std::uint64_t NsToMs(std::uint64_t ns) {
  return ns / 1000000ull;
}

}  // namespace

ProcessManager::ProcessManager() : startedAtNs_(NowNs()), ready_(false), message_("booting") {}

void ProcessManager::SetReady(const std::string& message) {
  ready_ = true;
  message_ = message;
}

void ProcessManager::SetDegraded(const std::string& message) {
  ready_ = false;
  message_ = message;
}

HealthStatus ProcessManager::GetHealth() const {
  HealthStatus status;
  status.ready = ready_;
  status.state = ready_ ? "ready" : "degraded";
  status.message = message_;
  status.uptimeMs = NsToMs(NowNs() - startedAtNs_);
  return status;
}

std::uint64_t ProcessManager::NowNs() {
  const std::chrono::steady_clock::time_point now = std::chrono::steady_clock::now();
  const std::chrono::nanoseconds ns =
      std::chrono::duration_cast<std::chrono::nanoseconds>(now.time_since_epoch());
  return static_cast<std::uint64_t>(ns.count());
}

}  // namespace service
}  // namespace vna
