#pragma once

#include "core/topology_types.h"

#include <cstdint>
#include <string>
#include <vector>

#include "core/instance_types.h"
#include "core/status.h"

namespace vna {
namespace core {

class TopologyManager {
 public:
  ValidationResult ValidateTopology(const Topology& topology) const;

  // Extract instance configs from topology YAML.
  // Pre-GA: uses a minimal parser; errors are returned as Status + messages.
  Status ExtractInstanceConfigs(const Topology& topology,
                               const std::string& workspaceId,
                               std::uint32_t defaultLeaseTtlSeconds,
                               std::vector<InstanceConfig>& outConfigs,
                               std::vector<std::string>& outErrors) const;

 private:
  static bool IsWhitespaceOnly(const std::string& text);
};

}  // namespace core
}  // namespace vna
