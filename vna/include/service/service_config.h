#pragma once

#include <cstdint>
#include <string>
#include <vector>

#include "core/status.h"

namespace vna {
namespace service {

struct ServiceConfig {
  std::string bindAddress = "0.0.0.0";
  std::uint32_t port = 50051;
  bool tlsEnabled = false;
  std::string logLevel = "info";
  std::uint32_t streamThrottleEveryNFrames = 4;
  std::uint32_t streamThrottleMs = 10;
  bool deEmbeddingEnabled = false;
  std::string deEmbeddingPortTransfer = "";
};

class ServiceConfigLoader {
 public:
  static core::Status LoadFromFile(const std::string& filePath,
                                   ServiceConfig& outConfig,
                                   std::vector<std::string>& outErrors);

 private:
  static std::string Trim(const std::string& text);
  static bool ParseBool(const std::string& text, bool& outValue);
  static bool ParseUInt32(const std::string& text, std::uint32_t& outValue);
};

}  // namespace service
}  // namespace vna
