#include "core/vna_runtime.h"

#include <vector>

#include <map>

#include "core/instance_types.h"
#include "core/topology_manager.h"

namespace vna {
namespace core {

VnaRuntime::VnaRuntime()
    : resourceManager_(),
      instanceManager_(&resourceManager_),
      instanceIds_(),
      topologyApplied_(false) {}

Status VnaRuntime::ApplyTopology(const Topology& topology,
                                const std::string& workspaceId,
                                std::uint32_t defaultLeaseTtlSeconds) {
  if (topologyApplied_ || instanceManager_.InstanceCount() != 0) {
    return Status::kInternalError;
  }

  TopologyManager topoManager;

  std::vector<InstanceConfig> configs;
  std::vector<std::string> errors;
  const Status status = topoManager.ExtractInstanceConfigs(
      topology,
      workspaceId,
      defaultLeaseTtlSeconds,
      configs,
      errors);
  if (status != Status::kOk) {
    return status;
  }

  instanceIds_.clear();

  // Pre-flight: reject duplicate instance ids to avoid partial state.
  std::map<std::string, int> seen;
  for (std::size_t i = 0; i < configs.size(); ++i) {
    if (seen.find(configs[i].instanceId) != seen.end()) {
      return Status::kInvalidArgument;
    }
    seen[configs[i].instanceId] = 1;
  }

  for (std::size_t i = 0; i < configs.size(); ++i) {
    const Status createStatus = instanceManager_.CreateInstance(configs[i]);
    if (createStatus != Status::kOk) {
      return createStatus;
    }
    instanceIds_.push_back(configs[i].instanceId);
  }

  topologyApplied_ = true;
  return Status::kOk;
}

Status VnaRuntime::StartAll() {
  // Best-effort: if starting one instance fails, stop any already-started instances
  // to avoid leaking resource leases.
  std::vector<std::string> started;
  started.reserve(instanceIds_.size());

  for (std::size_t i = 0; i < instanceIds_.size(); ++i) {
    const std::string& id = instanceIds_[i];
    const Status status = instanceManager_.StartInstance(id);
    if (status != Status::kOk) {
      for (std::size_t j = started.size(); j > 0; --j) {
        instanceManager_.StopInstance(started[j - 1]);
      }
      return status;
    }
    started.push_back(id);
  }

  return Status::kOk;
}

Status VnaRuntime::StopAll() {
  Status firstError = Status::kOk;
  for (std::size_t i = 0; i < instanceIds_.size(); ++i) {
    const Status status = instanceManager_.StopInstance(instanceIds_[i]);
    if (status != Status::kOk && firstError == Status::kOk) {
      firstError = status;
    }
  }
  return firstError;
}

Status VnaRuntime::AcquireOnce(const std::string& instanceId,
                              const ExcitationConfig& excitation,
                              std::uint32_t sampleCount,
                              std::uint32_t timeoutMs,
                              AcquisitionResult& out) {
  return instanceManager_.AcquireOnce(instanceId, excitation, sampleCount, timeoutMs, out);
}

std::size_t VnaRuntime::InstanceCount() const {
  return instanceManager_.InstanceCount();
}

std::size_t VnaRuntime::ActiveLeaseCount() const {
  return resourceManager_.ActiveLeaseCount();
}

}  // namespace core
}  // namespace vna
