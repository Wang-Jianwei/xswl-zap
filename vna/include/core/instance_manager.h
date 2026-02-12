#pragma once

#include <cstdint>
#include <map>
#include <memory>
#include <string>

#include "core/excitation_mode.h"
#include "core/instance_types.h"
#include "core/measurement_data.h"
#include "core/measurement_pipeline.h"
#include "core/resource_manager.h"
#include "core/status.h"
#include "core/topology_manager.h"

namespace vna {
namespace core {

class InstanceManager {
 public:
  explicit InstanceManager(ResourceManager* resourceManager);

  // Create instance entries from a topology document.
  // Pre-GA: topology YAML must include driver/device/resource fields for each instance.
  Status CreateInstancesFromTopology(const Topology& topology,
                                     const std::string& workspaceId,
                                     std::uint32_t defaultLeaseTtlSeconds);

  Status CreateInstance(const InstanceConfig& config);
  Status StartInstance(const std::string& instanceId);
  Status StopInstance(const std::string& instanceId);

  Status AcquireOnce(const std::string& instanceId,
                     const ExcitationConfig& excitation,
                     std::uint32_t sampleCount,
                     std::uint32_t timeoutMs,
                     AcquisitionResult& out);

  std::size_t InstanceCount() const;

 private:
  struct InstanceEntry {
    InstanceConfig config;

    // Resource lease id when running.
    std::string leaseId;

    std::unique_ptr<HardwareCoordinator> coordinator;
    std::unique_ptr<MeasurementPipeline> pipeline;

    bool running = false;
  };

  ResourceManager* resourceManager_;
  std::map<std::string, InstanceEntry> instances_;
};

}  // namespace core
}  // namespace vna
