#pragma once

#include <cstdint>
#include <string>
#include <vector>

#include "core/excitation_mode.h"
#include "core/measurement_data.h"
#include "core/status.h"
#include "core/topology_types.h"
#include "core/vna_runtime.h"

namespace vna {
namespace service {

struct TopologyErrorDetail {
  std::string code;
  std::string field;
  std::string message;
};

struct TopologyValidationReport {
  bool ok = true;
  std::vector<TopologyErrorDetail> errors;
};

// VnaControlService is a minimal, in-process service facade over core runtime.
// It is intended to be wrapped by a transport layer later (e.g. grpc-cpp).
class VnaControlService {
 public:
  VnaControlService();

  // Stateless topology validation (does not modify runtime state).
  core::ValidationResult ValidateTopology(const core::Topology& topology) const;
  TopologyValidationReport ValidateTopologyStructured(const core::Topology& topology) const;

  // Applies topology and creates instances (single-apply in Pre-GA runtime).
  core::Status ApplyTopology(const core::Topology& topology,
                            const std::string& workspaceId,
                            std::uint32_t defaultLeaseTtlSeconds);

  core::Status Start();
  core::Status Stop();

  core::Status AcquireOnce(const std::string& instanceId,
                          const core::ExcitationConfig& excitation,
                          std::uint32_t sampleCount,
                          std::uint32_t timeoutMs,
                          core::AcquisitionResult& out);

  core::Status ExportAcquisitionResult(const core::AcquisitionResult& result,
                                       const std::string& csvPath,
                                       const std::string& touchstonePath,
                                       const std::string& jsonPath,
                                       std::string* errorMessage = nullptr);

  core::Status ImportAcquisitionResult(const std::string& jsonPath,
                                       core::AcquisitionResult& out,
                                       std::string* errorMessage = nullptr);

  std::size_t InstanceCount() const;
  std::size_t ActiveLeaseCount() const;

 private:
  static TopologyErrorDetail BuildTopologyError(const std::string& rawError);

  core::VnaRuntime runtime_;
  bool started_;
};

}  // namespace service
}  // namespace vna
