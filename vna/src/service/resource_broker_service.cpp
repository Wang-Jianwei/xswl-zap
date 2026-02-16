#include "service/resource_broker_service.h"

#include <chrono>
#include <sstream>

namespace vna {
namespace service {

std::uint64_t ResourceBrokerService::NowMs() {
  return static_cast<std::uint64_t>(
      std::chrono::duration_cast<std::chrono::milliseconds>(
          std::chrono::system_clock::now().time_since_epoch())
          .count());
}

std::string ResourceBrokerService::BuildSelectorKey(const LockSelector& selector) {
  std::ostringstream oss;
  oss << static_cast<int>(selector.type) << ":" << selector.resourceId;
  return oss.str();
}

bool ResourceBrokerService::IsSameOwner(const LockOwner& left, const LockOwner& right) {
  return left.workspaceId == right.workspaceId &&
         left.instanceId == right.instanceId &&
         left.sessionId == right.sessionId &&
         left.actor == right.actor;
}

bool ResourceBrokerService::IsCompatible(LockMode requestedMode,
                                         const std::vector<LockLease>& existingLeases,
                                         const LockOwner& requester,
                                         LockConflictDetail& outConflict) {
  for (std::size_t i = 0; i < existingLeases.size(); ++i) {
    const LockLease& lease = existingLeases[i];
    if (IsSameOwner(lease.owner, requester)) {
      continue;
    }

    const bool requestedExclusive = requestedMode == LockMode::kExclusive;
    const bool existingExclusive = lease.mode == LockMode::kExclusive;
    if (requestedExclusive || existingExclusive) {
      outConflict.selector = lease.selector;
      outConflict.holderLeaseId = lease.leaseId;
      outConflict.holderOwner = lease.owner;
      outConflict.holderFencingToken = lease.fencingToken;
      outConflict.holderExpireAtMs = lease.expireAtMs;
      outConflict.suggestion = "retry_after_release_or_use_readonly";
      return false;
    }
  }
  return true;
}

void ResourceBrokerService::PruneExpiredLeasesLocked(std::uint64_t nowMs) const {
  for (std::map<std::string, std::vector<LockLease> >::iterator it = lockTableBySelector_.begin();
       it != lockTableBySelector_.end();) {
    std::vector<LockLease>& leases = it->second;
    for (std::size_t i = 0; i < leases.size();) {
      if (leases[i].expireAtMs <= nowMs) {
        selectorByLeaseId_.erase(leases[i].leaseId);
        leases.erase(leases.begin() + static_cast<long long>(i));
      } else {
        ++i;
      }
    }

    if (leases.empty()) {
      it = lockTableBySelector_.erase(it);
    } else {
      ++it;
    }
  }
}

ResourceBrokerService::ResourceBrokerService() : manager_() {}

core::Status ResourceBrokerService::Acquire(const core::ResourceRequest& request,
                                            std::uint32_t ttlSeconds,
                                            core::LeaseInfo& outLease) {
  return manager_.Acquire(request, ttlSeconds, outLease);
}

core::Status ResourceBrokerService::Renew(const core::LeaseInfo& lease,
                                          std::uint32_t ttlSeconds) {
  return manager_.Renew(lease.leaseId, ttlSeconds);
}

core::Status ResourceBrokerService::Release(const core::LeaseInfo& lease) {
  return manager_.Release(lease.leaseId);
}

core::Status ResourceBrokerService::AcquireLock(const LockAcquireRequest& request,
                                                LockAcquireResult& out) {
  out = LockAcquireResult();
  if (request.selector.type == LockResourceType::kUnspecified ||
      request.selector.resourceId.empty() ||
      request.mode == LockMode::kUnspecified ||
      request.ttlSeconds == 0) {
    out.status = core::Status::kInvalidArgument;
    out.code = "INVALID_ARGUMENT";
    out.message = "selector/mode/ttl is required";
    return out.status;
  }

  const std::uint64_t nowMs = NowMs();
  std::lock_guard<std::mutex> lock(lockMutex_);
  PruneExpiredLeasesLocked(nowMs);

  if (request.expectedMinFencingToken > 0 && nextFencingToken_ < request.expectedMinFencingToken) {
    out.status = core::Status::kTimeout;
    out.code = "LOCK_STALE";
    out.state = LockState::kStale;
    out.message = "expected_min_fencing_token is not satisfied";
    return out.status;
  }

  const std::string selectorKey = BuildSelectorKey(request.selector);
  std::vector<LockLease>& existing = lockTableBySelector_[selectorKey];

  LockConflictDetail conflict;
  if (!IsCompatible(request.mode, existing, request.owner, conflict)) {
    out.status = core::Status::kTimeout;
    out.code = "LOCK_CONFLICT";
    out.state = LockState::kConflict;
    out.message = "resource lock conflict";
    out.conflicts.push_back(conflict);
    return out.status;
  }

  LockLease lease;
  {
    std::ostringstream leaseIdBuilder;
    leaseIdBuilder << "lock-" << nextLeaseId_++;
    lease.leaseId = leaseIdBuilder.str();
  }
  lease.selector = request.selector;
  lease.owner = request.owner;
  lease.mode = request.mode;
  lease.fencingToken = nextFencingToken_++;
  lease.acquiredAtMs = nowMs;
  lease.expireAtMs = nowMs + static_cast<std::uint64_t>(request.ttlSeconds) * 1000ULL;

  existing.push_back(lease);
  selectorByLeaseId_[lease.leaseId] = selectorKey;

  out.status = core::Status::kOk;
  out.code = "OK";
  out.state = LockState::kAcquired;
  out.message = "lock acquired";
  out.lease = lease;
  return out.status;
}

core::Status ResourceBrokerService::RenewLock(const LockRenewRequest& request,
                                              LockOperationResult& out) {
  out = LockOperationResult();
  if (request.leaseId.empty() || request.ttlSeconds == 0) {
    out.status = core::Status::kInvalidArgument;
    out.code = "INVALID_ARGUMENT";
    out.message = "lease_id and ttl are required";
    return out.status;
  }

  const std::uint64_t nowMs = NowMs();
  std::lock_guard<std::mutex> lock(lockMutex_);
  PruneExpiredLeasesLocked(nowMs);

  const std::map<std::string, std::string>::iterator leaseIndex = selectorByLeaseId_.find(request.leaseId);
  if (leaseIndex == selectorByLeaseId_.end()) {
    out.status = core::Status::kTimeout;
    out.code = "LOCK_STALE";
    out.state = LockState::kStale;
    out.message = "lease not found";
    return out.status;
  }

  std::vector<LockLease>& leases = lockTableBySelector_[leaseIndex->second];
  for (std::size_t i = 0; i < leases.size(); ++i) {
    LockLease& lease = leases[i];
    if (lease.leaseId != request.leaseId) {
      continue;
    }
    if (!IsSameOwner(lease.owner, request.owner) || lease.fencingToken != request.fencingToken) {
      out.status = core::Status::kTimeout;
      out.code = "LOCK_STALE";
      out.state = LockState::kStale;
      out.message = "owner or fencing token mismatch";
      return out.status;
    }

    lease.expireAtMs = nowMs + static_cast<std::uint64_t>(request.ttlSeconds) * 1000ULL;
    out.status = core::Status::kOk;
    out.code = "OK";
    out.state = LockState::kRefreshed;
    out.message = "lock renewed";
    out.lease = lease;
    return out.status;
  }

  out.status = core::Status::kTimeout;
  out.code = "LOCK_STALE";
  out.state = LockState::kStale;
  out.message = "lease not found";
  return out.status;
}

core::Status ResourceBrokerService::ReleaseLock(const LockReleaseRequest& request,
                                                LockOperationResult& out) {
  out = LockOperationResult();
  if (request.leaseId.empty()) {
    out.status = core::Status::kInvalidArgument;
    out.code = "INVALID_ARGUMENT";
    out.message = "lease_id is required";
    return out.status;
  }

  const std::uint64_t nowMs = NowMs();
  std::lock_guard<std::mutex> lock(lockMutex_);
  PruneExpiredLeasesLocked(nowMs);

  const std::map<std::string, std::string>::iterator leaseIndex = selectorByLeaseId_.find(request.leaseId);
  if (leaseIndex == selectorByLeaseId_.end()) {
    out.status = core::Status::kTimeout;
    out.code = "LOCK_STALE";
    out.state = LockState::kStale;
    out.message = "lease not found";
    return out.status;
  }

  std::vector<LockLease>& leases = lockTableBySelector_[leaseIndex->second];
  for (std::size_t i = 0; i < leases.size(); ++i) {
    const LockLease& lease = leases[i];
    if (lease.leaseId != request.leaseId) {
      continue;
    }
    if (!IsSameOwner(lease.owner, request.owner) || lease.fencingToken != request.fencingToken) {
      out.status = core::Status::kTimeout;
      out.code = "LOCK_STALE";
      out.state = LockState::kStale;
      out.message = "owner or fencing token mismatch";
      return out.status;
    }

    out.lease = lease;
    leases.erase(leases.begin() + static_cast<long long>(i));
    selectorByLeaseId_.erase(request.leaseId);
    if (leases.empty()) {
      lockTableBySelector_.erase(leaseIndex->second);
    }
    out.status = core::Status::kOk;
    out.code = "OK";
    out.state = LockState::kReleased;
    out.message = "lock released";
    return out.status;
  }

  out.status = core::Status::kTimeout;
  out.code = "LOCK_STALE";
  out.state = LockState::kStale;
  out.message = "lease not found";
  return out.status;
}

std::vector<LockLease> ResourceBrokerService::GetLockSnapshot(
    const std::vector<LockSelector>& selectors) const {
  std::vector<LockLease> snapshot;
  const std::uint64_t nowMs = NowMs();
  std::lock_guard<std::mutex> lock(lockMutex_);
  PruneExpiredLeasesLocked(nowMs);

  if (selectors.empty()) {
    for (std::map<std::string, std::vector<LockLease> >::const_iterator it = lockTableBySelector_.begin();
         it != lockTableBySelector_.end();
         ++it) {
      for (std::size_t i = 0; i < it->second.size(); ++i) {
        snapshot.push_back(it->second[i]);
      }
    }
    return snapshot;
  }

  for (std::size_t i = 0; i < selectors.size(); ++i) {
    const std::string selectorKey = BuildSelectorKey(selectors[i]);
    const std::map<std::string, std::vector<LockLease> >::const_iterator found =
        lockTableBySelector_.find(selectorKey);
    if (found == lockTableBySelector_.end()) {
      continue;
    }
    for (std::size_t j = 0; j < found->second.size(); ++j) {
      snapshot.push_back(found->second[j]);
    }
  }
  return snapshot;
}

bool ResourceBrokerService::HasActiveConflicts(const std::vector<LockSelector>& selectors,
                                               const LockOwner& requester,
                                               std::vector<LockConflictDetail>& outConflicts) const {
  outConflicts.clear();
  const std::uint64_t nowMs = NowMs();
  std::lock_guard<std::mutex> lock(lockMutex_);
  PruneExpiredLeasesLocked(nowMs);

  for (std::size_t i = 0; i < selectors.size(); ++i) {
    const std::string selectorKey = BuildSelectorKey(selectors[i]);
    const std::map<std::string, std::vector<LockLease> >::const_iterator found =
        lockTableBySelector_.find(selectorKey);
    if (found == lockTableBySelector_.end()) {
      continue;
    }

    for (std::size_t j = 0; j < found->second.size(); ++j) {
      const LockLease& lease = found->second[j];
      if (IsSameOwner(lease.owner, requester)) {
        continue;
      }
      LockConflictDetail detail;
      detail.selector = lease.selector;
      detail.holderLeaseId = lease.leaseId;
      detail.holderOwner = lease.owner;
      detail.holderFencingToken = lease.fencingToken;
      detail.holderExpireAtMs = lease.expireAtMs;
      detail.suggestion = "open_readonly_or_retry_after_release";
      outConflicts.push_back(detail);
    }
  }
  return !outConflicts.empty();
}

std::size_t ResourceBrokerService::ActiveLeaseCount() const {
  return manager_.ActiveLeaseCount();
}

}  // namespace service
}  // namespace vna
