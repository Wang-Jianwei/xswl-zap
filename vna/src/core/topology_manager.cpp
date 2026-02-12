#include "core/topology_manager.h"

#include <cctype>

#include "core/topology_parser.h"

namespace vna {
namespace core {

bool TopologyManager::IsWhitespaceOnly(const std::string& text) {
  for (std::size_t i = 0; i < text.size(); ++i) {
    if (!std::isspace(static_cast<unsigned char>(text[i]))) {
      return false;
    }
  }
  return true;
}

ValidationResult TopologyManager::ValidateTopology(const Topology& topology) const {
  ValidationResult result;

  if (topology.id.empty()) {
    result.ok = false;
    result.errors.push_back("topology.id is required");
  }

  if (topology.yaml.empty() || IsWhitespaceOnly(topology.yaml)) {
    result.ok = false;
    result.errors.push_back("topology.yaml is empty");
    return result;
  }

  const std::size_t kMaxYamlBytes = 512u * 1024u;
  if (topology.yaml.size() > kMaxYamlBytes) {
    result.ok = false;
    result.errors.push_back("topology.yaml too large (>512KiB)");
  }

  // Tabs in YAML are a common source of parsing ambiguity; enforce spaces.
  if (topology.yaml.find('\t') != std::string::npos) {
    result.ok = false;
    result.errors.push_back("topology.yaml contains TAB characters; use spaces for indentation");
  }

  // Minimal heuristic: ensure the YAML likely describes at least one entity.
  const bool mentionsEntity =
      (topology.yaml.find("instance") != std::string::npos) ||
      (topology.yaml.find("device") != std::string::npos) ||
      (topology.yaml.find("board") != std::string::npos) ||
      (topology.yaml.find("port") != std::string::npos);

  if (!mentionsEntity) {
    result.ok = false;
    result.errors.push_back(
        "topology.yaml does not appear to define any entity (instance/device/board/port)");
  }

  return result;
}

Status TopologyManager::ExtractInstanceConfigs(const Topology& topology,
                                               const std::string& workspaceId,
                                               std::uint32_t defaultLeaseTtlSeconds,
                                               std::vector<InstanceConfig>& outConfigs,
                                               std::vector<std::string>& outErrors) const {
  outConfigs.clear();
  outErrors.clear();

  const ValidationResult base = ValidateTopology(topology);
  if (!base.ok) {
    outErrors = base.errors;
    return Status::kInvalidArgument;
  }

  TopologyParser parser;
  const TopologyParser::ParseResult parsed =
      parser.ParseInstances(topology.yaml, workspaceId, defaultLeaseTtlSeconds);
  if (parsed.status != Status::kOk) {
    outErrors = parsed.errors;
    return parsed.status;
  }

  outConfigs = parsed.instances;
  return Status::kOk;
}

}  // namespace core
}  // namespace vna
