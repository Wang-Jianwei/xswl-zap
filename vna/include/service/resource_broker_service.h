#pragma once

#include <cstdint>
#include <map>
#include <string>
#include <vector>
#include <mutex>

#include "core/resource_manager.h"
#include "core/resource_types.h"
#include "core/status.h"

namespace vna {
namespace service {

enum class LockResourceType {
  kUnspecified = 0,
  kPhysicalDevice = 1,
  kMockDevice = 2,
  kVirtualVna = 3,
  kTriggerLine = 4,
  kClockDomain = 5,
  kWorkspaceSession = 6,
};

enum class LockMode {
  kUnspecified = 0,
  kShared = 1,
  kExclusive = 2,
};

enum class LockState {
  kUnspecified = 0,
  kAcquired = 1,
  kRefreshed = 2,
  kReleased = 3,
  kConflict = 4,
  kStale = 5,
  kExpired = 6,
};

struct LockSelector {
  LockResourceType type = LockResourceType::kUnspecified;
  std::string resourceId;
};

struct LockOwner {
  std::string workspaceId;
  std::string instanceId;
  std::string sessionId;
  std::string actor;
};

struct LockLease {
  std::string leaseId;
  LockSelector selector;
  LockOwner owner;
  LockMode mode = LockMode::kUnspecified;
  std::uint64_t fencingToken = 0;
  std::uint64_t acquiredAtMs = 0;
  std::uint64_t expireAtMs = 0;
};

struct LockConflictDetail {
  LockSelector selector;
  std::string holderLeaseId;
  LockOwner holderOwner;
  std::uint64_t holderFencingToken = 0;
  std::uint64_t holderExpireAtMs = 0;
  std::string suggestion;
};

struct LockAcquireRequest {
  LockSelector selector;
  LockOwner owner;
  LockMode mode = LockMode::kUnspecified;
  std::uint32_t ttlSeconds = 0;
  std::uint32_t waitTimeoutMs = 0;
  std::uint64_t expectedMinFencingToken = 0;
};

struct LockAcquireResult {
  core::Status status = core::Status::kInvalidArgument;
  std::string code;
  std::string message;
  LockState state = LockState::kUnspecified;
  LockLease lease;
  std::vector<LockConflictDetail> conflicts;
};

struct LockRenewRequest {
  std::string leaseId;
  LockOwner owner;
  std::uint64_t fencingToken = 0;
  std::uint32_t ttlSeconds = 0;
};

struct LockReleaseRequest {
  std::string leaseId;
  LockOwner owner;
  std::uint64_t fencingToken = 0;
};

struct LockOperationResult {
  core::Status status = core::Status::kInvalidArgument;
  std::string code;
  std::string message;
  LockState state = LockState::kUnspecified;
  LockLease lease;
  std::vector<LockConflictDetail> conflicts;
};

// ResourceBrokerService is a minimal in-process facade over ResourceManager.
// It is intended to be wrapped by transport layer APIs later.
class ResourceBrokerService {
 public:
  ResourceBrokerService();

  core::Status Acquire(const core::ResourceRequest& request,
                       std::uint32_t ttlSeconds,
                       core::LeaseInfo& outLease);

  core::Status Renew(const core::LeaseInfo& lease,
                     std::uint32_t ttlSeconds);

  core::Status Release(const core::LeaseInfo& lease);

  core::Status AcquireLock(const LockAcquireRequest& request,
                           LockAcquireResult& out);

  core::Status RenewLock(const LockRenewRequest& request,
                         LockOperationResult& out);

  core::Status ReleaseLock(const LockReleaseRequest& request,
                           LockOperationResult& out);

  std::vector<LockLease> GetLockSnapshot(const std::vector<LockSelector>& selectors) const;

  bool HasActiveConflicts(const std::vector<LockSelector>& selectors,
                          const LockOwner& requester,
                          std::vector<LockConflictDetail>& outConflicts) const;

  std::size_t ActiveLeaseCount() const;

 private:
  static std::uint64_t NowMs();
  static std::string BuildSelectorKey(const LockSelector& selector);
  static bool IsSameOwner(const LockOwner& left, const LockOwner& right);
  static bool IsCompatible(LockMode requestedMode,
                           const std::vector<LockLease>& existingLeases,
                           const LockOwner& requester,
                           LockConflictDetail& outConflict);
  void PruneExpiredLeasesLocked(std::uint64_t nowMs) const;

  core::ResourceManager manager_;
  mutable std::mutex lockMutex_;
  mutable std::map<std::string, std::vector<LockLease> > lockTableBySelector_;
  mutable std::map<std::string, std::string> selectorByLeaseId_;
  mutable std::uint64_t nextFencingToken_ = 1;
  mutable std::uint64_t nextLeaseId_ = 1;
};

}  // namespace service
}  // namespace vna
