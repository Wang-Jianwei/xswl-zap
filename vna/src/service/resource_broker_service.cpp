#include "service/resource_broker_service.h"

namespace vna {
namespace service {

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

std::size_t ResourceBrokerService::ActiveLeaseCount() const {
  return manager_.ActiveLeaseCount();
}

}  // namespace service
}  // namespace vna
