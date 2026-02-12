#pragma once

#include <string>
#include <vector>

#include "core/instance_types.h"
#include "core/status.h"

namespace vna {
namespace core {

// Pre-GA minimal parser for topology YAML text.
// NOTE: This is NOT a full YAML parser. It only supports a tiny subset used in tests.
class TopologyParser {
 public:
  struct ParseResult {
    Status status = Status::kOk;
    std::vector<InstanceConfig> instances;
    std::vector<std::string> errors;
  };

  // Extract instances from YAML text.
  // Expected shape:
  // instances:
  //   - id: inst0
  //     driver: pxi
  //     device: pxi-mock-0
  //     resource: dev0
  //   - id: inst1
  //     driver: usb
  //     device: usb-mock-0
  //     resource: dev0
  ParseResult ParseInstances(const std::string& yaml,
                             const std::string& workspaceId,
                             std::uint32_t defaultLeaseTtlSeconds) const;

 private:
  static std::string Trim(const std::string& s);
  static bool StartsWith(const std::string& s, const std::string& prefix);
};

}  // namespace core
}  // namespace vna
