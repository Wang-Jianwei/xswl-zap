#include "core/resource_manager.h"

#include <chrono>
#include <sstream>

namespace vna {
namespace core {

namespace {

std::uint64_t SecondsToNs(std::uint32_t seconds) {
  return static_cast<std::uint64_t>(seconds) * 1000000000ull;
}

}  // namespace

ResourceManager::ResourceManager() {}

std::uint64_t ResourceManager::NowNs() {
  const std::chrono::steady_clock::time_point now = std::chrono::steady_clock::now();
  const std::chrono::nanoseconds ns =
      std::chrono::duration_cast<std::chrono::nanoseconds>(now.time_since_epoch());
  return static_cast<std::uint64_t>(ns.count());
}

std::string ResourceManager::GenerateLeaseId(const std::string& resourceId, std::uint64_t nowNs) {
  std::ostringstream oss;
  oss << "lease-" << resourceId << "-" << nowNs;
  return oss.str();
}

Status ResourceManager::Acquire(const ResourceRequest& request,
                               std::uint32_t ttlSeconds,
                               LeaseInfo& outLease) {
  if (request.resourceId.empty() || request.workspaceId.empty() || ttlSeconds == 0) {
    return Status::kInvalidArgument;
  }

  PurgeExpired();

  const std::map<std::string, std::string>::const_iterator existing =
      leaseIdByResourceId_.find(request.resourceId);
  if (existing != leaseIdByResourceId_.end()) {
    return Status::kTimeout;  // simplified: treat contention as timeout for now
  }

  const std::uint64_t nowNs = NowNs();
  const std::string leaseId = GenerateLeaseId(request.resourceId, nowNs);

  LeaseEntry entry;
  entry.info.leaseId = leaseId;
  entry.info.resourceId = request.resourceId;
  entry.info.workspaceId = request.workspaceId;
  entry.info.ttlSeconds = ttlSeconds;
  entry.expiresAtNs = nowNs + SecondsToNs(ttlSeconds);

  leasesById_[leaseId] = entry;
  leaseIdByResourceId_[request.resourceId] = leaseId;

  outLease = entry.info;
  return Status::kOk;
}

Status ResourceManager::Renew(const std::string& leaseId, std::uint32_t ttlSeconds) {
  if (leaseId.empty() || ttlSeconds == 0) {
    return Status::kInvalidArgument;
  }

  PurgeExpired();

  std::map<std::string, LeaseEntry>::iterator it = leasesById_.find(leaseId);
  if (it == leasesById_.end()) {
    return Status::kTimeout;
  }

  const std::uint64_t nowNs = NowNs();
  it->second.info.ttlSeconds = ttlSeconds;
  it->second.expiresAtNs = nowNs + SecondsToNs(ttlSeconds);
  return Status::kOk;
}

Status ResourceManager::Release(const std::string& leaseId) {
  if (leaseId.empty()) {
    return Status::kInvalidArgument;
  }

  std::map<std::string, LeaseEntry>::iterator it = leasesById_.find(leaseId);
  if (it == leasesById_.end()) {
    return Status::kTimeout;
  }

  const std::string resourceId = it->second.info.resourceId;
  leasesById_.erase(it);

  std::map<std::string, std::string>::iterator mapIt = leaseIdByResourceId_.find(resourceId);
  if (mapIt != leaseIdByResourceId_.end() && mapIt->second == leaseId) {
    leaseIdByResourceId_.erase(mapIt);
  }

  return Status::kOk;
}

void ResourceManager::PurgeExpired() {
  const std::uint64_t nowNs = NowNs();

  for (std::map<std::string, LeaseEntry>::iterator it = leasesById_.begin();
       it != leasesById_.end();) {
    if (it->second.expiresAtNs <= nowNs) {
      const std::string resourceId = it->second.info.resourceId;
      const std::string leaseId = it->second.info.leaseId;

      std::map<std::string, std::string>::iterator mapIt = leaseIdByResourceId_.find(resourceId);
      if (mapIt != leaseIdByResourceId_.end() && mapIt->second == leaseId) {
        leaseIdByResourceId_.erase(mapIt);
      }

      std::map<std::string, LeaseEntry>::iterator eraseIt = it++;
      leasesById_.erase(eraseIt);
      continue;
    }
    ++it;
  }
}

std::size_t ResourceManager::ActiveLeaseCount() const {
  return leasesById_.size();
}

}  // namespace core
}  // namespace vna
