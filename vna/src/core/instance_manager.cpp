#include "core/instance_manager.h"

#include <memory>

#include "core/hardware_driver_factory.h"
#include "core/resource_types.h"

namespace vna {
namespace core {

InstanceManager::InstanceManager(ResourceManager* resourceManager)
    : resourceManager_(resourceManager) {}

Status InstanceManager::CreateInstancesFromTopology(const Topology& topology,
                                                    const std::string& workspaceId,
                                                    std::uint32_t defaultLeaseTtlSeconds) {
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

  for (std::size_t i = 0; i < configs.size(); ++i) {
    const Status createStatus = CreateInstance(configs[i]);
    if (createStatus != Status::kOk) {
      return createStatus;
    }
  }

  return Status::kOk;
}

Status InstanceManager::CreateInstance(const InstanceConfig& config) {
  std::lock_guard<std::mutex> lock(mutex_);
  if (config.instanceId.empty() || config.workspaceId.empty() || config.driverType.empty() ||
      config.deviceIdentifier.empty() || config.resourceId.empty() || config.leaseTtlSeconds == 0) {
    return Status::kInvalidArgument;
  }

  if (instances_.find(config.instanceId) != instances_.end()) {
    return Status::kInternalError;
  }

  InstanceEntry entry;
  entry.config = config;
  instances_[config.instanceId] = std::move(entry);
  return Status::kOk;
}

Status InstanceManager::StartInstance(const std::string& instanceId) {
  std::lock_guard<std::mutex> lock(mutex_);
  if (!resourceManager_) {
    return Status::kInternalError;
  }

  std::map<std::string, InstanceEntry>::iterator it = instances_.find(instanceId);
  if (it == instances_.end()) {
    return Status::kInvalidArgument;
  }

  InstanceEntry& entry = it->second;
  if (entry.running) {
    return Status::kOk;
  }

  // Acquire resource lease.
  ResourceRequest request;
  request.resourceId = entry.config.resourceId;
  request.workspaceId = entry.config.workspaceId;
  request.exclusive = true;
  request.timeoutMs = 0;

  LeaseInfo lease;
  Status status = resourceManager_->Acquire(request, entry.config.leaseTtlSeconds, lease);
  if (status != Status::kOk) {
    return status;
  }

  // Create hardware driver.
  std::unique_ptr<HardwareDriver> driver = HardwareDriverFactory::CreateDriver(
      entry.config.driverType,
      entry.config.deviceIdentifier);
  if (!driver) {
    resourceManager_->Release(lease.leaseId);
    return Status::kInvalidArgument;
  }

  std::unique_ptr<HardwareCoordinator> coordinator(new HardwareCoordinator());
  status = coordinator->SetDriver(std::move(driver));
  if (status != Status::kOk) {
    resourceManager_->Release(lease.leaseId);
    return status;
  }

  status = coordinator->Initialize();
  if (status != Status::kOk) {
    resourceManager_->Release(lease.leaseId);
    return status;
  }

  std::unique_ptr<MeasurementPipeline> pipeline(new MeasurementPipeline(coordinator.get()));

  entry.leaseId = lease.leaseId;
  entry.coordinator = std::move(coordinator);
  entry.pipeline = std::move(pipeline);
  entry.running = true;
  return Status::kOk;
}

Status InstanceManager::StopInstance(const std::string& instanceId) {
  std::lock_guard<std::mutex> lock(mutex_);
  if (!resourceManager_) {
    return Status::kInternalError;
  }

  std::map<std::string, InstanceEntry>::iterator it = instances_.find(instanceId);
  if (it == instances_.end()) {
    return Status::kInvalidArgument;
  }

  InstanceEntry& entry = it->second;
  if (!entry.running) {
    return Status::kOk;
  }

  if (entry.coordinator) {
    entry.coordinator->Shutdown();
  }

  if (!entry.leaseId.empty()) {
    resourceManager_->Release(entry.leaseId);
  }

  entry.pipeline.reset();
  entry.coordinator.reset();
  entry.leaseId.clear();
  entry.running = false;
  return Status::kOk;
}

Status InstanceManager::AcquireOnce(const std::string& instanceId,
                                   const ExcitationConfig& excitation,
                                   std::uint32_t sampleCount,
                                   std::uint32_t timeoutMs,
                                   AcquisitionResult& out) {
  std::lock_guard<std::mutex> lock(mutex_);
  std::map<std::string, InstanceEntry>::iterator it = instances_.find(instanceId);
  if (it == instances_.end()) {
    return Status::kInvalidArgument;
  }

  InstanceEntry& entry = it->second;
  if (!entry.running || !entry.pipeline) {
    return Status::kInvalidArgument;
  }

  if (!resourceManager_ || entry.leaseId.empty()) {
    return Status::kInternalError;
  }

  const Status renewStatus = resourceManager_->Renew(entry.leaseId, entry.config.leaseTtlSeconds);
  if (renewStatus == Status::kTimeout) {
    ResourceRequest request;
    request.resourceId = entry.config.resourceId;
    request.workspaceId = entry.config.workspaceId;
    request.exclusive = true;
    request.timeoutMs = 0;

    LeaseInfo lease;
    const Status reacquireStatus = resourceManager_->Acquire(request, entry.config.leaseTtlSeconds, lease);
    if (reacquireStatus != Status::kOk) {
      return reacquireStatus;
    }
    entry.leaseId = lease.leaseId;
  } else if (renewStatus != Status::kOk) {
    return renewStatus;
  }

  return entry.pipeline->Acquire(instanceId, excitation, sampleCount, timeoutMs, out);
}

Status InstanceManager::GetInstanceCapabilities(const std::string& instanceId,
                                                HardwareCapabilities& out) const {
  std::lock_guard<std::mutex> lock(mutex_);
  std::map<std::string, InstanceEntry>::const_iterator it = instances_.find(instanceId);
  if (it == instances_.end()) {
    return Status::kInvalidArgument;
  }

  if (it->second.coordinator && it->second.coordinator->GetDriver()) {
    out = it->second.coordinator->GetDriver()->GetCapabilities();
    return Status::kOk;
  }

  std::unique_ptr<HardwareDriver> driver = HardwareDriverFactory::CreateDriver(
      it->second.config.driverType,
      it->second.config.deviceIdentifier);
  if (!driver) {
    return Status::kInvalidArgument;
  }

  out = driver->GetCapabilities();
  return Status::kOk;
}

std::size_t InstanceManager::InstanceCount() const {
  std::lock_guard<std::mutex> lock(mutex_);
  return instances_.size();
}

}  // namespace core
}  // namespace vna
