#pragma once

#include <cstdint>
#include <string>
#include <vector>

#include "core/excitation_mode.h"
#include "core/hardware_driver.h"
#include "core/instance_manager.h"
#include "core/measurement_data.h"
#include "core/resource_manager.h"
#include "core/status.h"
#include "core/topology_types.h"

namespace vna {
namespace core {

// VnaRuntime is a minimal orchestrator that wires topology parsing, instance creation,
// resource leasing and one-shot acquisition into a single reusable entrypoint.
//
// Pre-GA policy: keep it simple and explicit; dynamic re-apply / diff of topology is out of scope.
class VnaRuntime {
 public:
  VnaRuntime();

  // Applies a topology document and creates instance entries.
  // Returns Status::kInternalError if a topology was already applied.
  Status ApplyTopology(const Topology& topology,
                      const std::string& workspaceId,
                      std::uint32_t defaultLeaseTtlSeconds);

  // Starts all instances created by ApplyTopology (acquires leases + initializes drivers).
  Status StartAll();

  // Stops all instances created by ApplyTopology (releases leases + shuts down drivers).
  Status StopAll();

  Status AcquireOnce(const std::string& instanceId,
                     const ExcitationConfig& excitation,
                     std::uint32_t sampleCount,
                     std::uint32_t timeoutMs,
                     AcquisitionResult& out);

  Status GetInstanceCapabilities(const std::string& instanceId,
                                 HardwareCapabilities& out) const;

  std::size_t InstanceCount() const;
  std::size_t ActiveLeaseCount() const;

 private:
  ResourceManager resourceManager_;
  InstanceManager instanceManager_;
  std::vector<std::string> instanceIds_;
  bool topologyApplied_;
};

}  // namespace core
}  // namespace vna
