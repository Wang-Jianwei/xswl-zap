#pragma once

#include <cstdint>
#include <mutex>
#include <string>

namespace vna {
namespace service {

struct HealthStatus {
  bool ready = false;
  std::string state;
  std::string message;
  std::uint64_t uptimeMs = 0;
};

class ProcessManager {
 public:
  ProcessManager();

  void SetReady(const std::string& message);
  void SetDegraded(const std::string& message);

  HealthStatus GetHealth() const;

 private:
  static std::uint64_t NowNs();

  mutable std::mutex mutex_;
  std::uint64_t startedAtNs_;
  bool ready_;
  std::string message_;
};

}  // namespace service
}  // namespace vna
