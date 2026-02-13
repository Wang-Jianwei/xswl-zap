#include "service/vna_control_service.h"

#include <vector>

#include "core/measurement_exporter.h"
#include "core/topology_manager.h"

namespace vna {
namespace service {

VnaControlService::VnaControlService() : runtime_(), started_(false) {}

core::ValidationResult VnaControlService::ValidateTopology(const core::Topology& topology) const {
  core::TopologyManager manager;
  return manager.ValidateTopology(topology);
}

TopologyValidationReport VnaControlService::ValidateTopologyStructured(
    const core::Topology& topology) const {
  const core::ValidationResult plain = ValidateTopology(topology);

  TopologyValidationReport report;
  report.ok = plain.ok;
  report.errors.reserve(plain.errors.size());

  for (std::size_t i = 0; i < plain.errors.size(); ++i) {
    report.errors.push_back(BuildTopologyError(plain.errors[i]));
  }

  return report;
}

TopologyErrorDetail VnaControlService::BuildTopologyError(const std::string& rawError) {
  TopologyErrorDetail detail;
  detail.message = rawError;

  if (rawError == "topology.id is required") {
    detail.code = "TOPOLOGY_ID_REQUIRED";
    detail.field = "topology.id";
    return detail;
  }

  if (rawError == "topology.yaml is empty") {
    detail.code = "TOPOLOGY_YAML_EMPTY";
    detail.field = "topology.yaml";
    return detail;
  }

  if (rawError == "topology.yaml too large (>512KiB)") {
    detail.code = "TOPOLOGY_YAML_TOO_LARGE";
    detail.field = "topology.yaml";
    return detail;
  }

  if (rawError == "topology.yaml contains TAB characters; use spaces for indentation") {
    detail.code = "TOPOLOGY_YAML_TAB_INDENT";
    detail.field = "topology.yaml";
    return detail;
  }

  if (rawError ==
      "topology.yaml does not appear to define any entity (instance/device/board/port)") {
    detail.code = "TOPOLOGY_YAML_NO_ENTITY";
    detail.field = "topology.yaml";
    return detail;
  }

  detail.code = "TOPOLOGY_INVALID";
  detail.field = "topology";
  return detail;
}

core::Status VnaControlService::ApplyTopology(const core::Topology& topology,
                                             const std::string& workspaceId,
                                             std::uint32_t defaultLeaseTtlSeconds) {
  if (started_) {
    return core::Status::kInternalError;
  }
  return runtime_.ApplyTopology(topology, workspaceId, defaultLeaseTtlSeconds);
}

core::Status VnaControlService::Start() {
  if (started_) {
    return core::Status::kOk;
  }

  const core::Status status = runtime_.StartAll();
  if (status != core::Status::kOk) {
    return status;
  }

  started_ = true;
  return core::Status::kOk;
}

core::Status VnaControlService::Stop() {
  const core::Status status = runtime_.StopAll();
  started_ = false;
  return status;
}

core::Status VnaControlService::AcquireOnce(const std::string& instanceId,
                                           const core::ExcitationConfig& excitation,
                                           std::uint32_t sampleCount,
                                           std::uint32_t timeoutMs,
                                           core::AcquisitionResult& out) {
  if (!started_) {
    return core::Status::kInvalidArgument;
  }
  return runtime_.AcquireOnce(instanceId, excitation, sampleCount, timeoutMs, out);
}

core::Status VnaControlService::ExportAcquisitionResult(const core::AcquisitionResult& result,
                                                       const std::string& csvPath,
                                                       const std::string& touchstonePath) {
  if (csvPath.empty() && touchstonePath.empty()) {
    return core::Status::kInvalidArgument;
  }

  if (!csvPath.empty()) {
    const core::Status csvStatus = core::MeasurementExporter::ExportCsv(result, csvPath);
    if (csvStatus != core::Status::kOk) {
      return csvStatus;
    }
  }

  if (!touchstonePath.empty()) {
    const core::Status touchstoneStatus = core::MeasurementExporter::ExportTouchstone(result, touchstonePath);
    if (touchstoneStatus != core::Status::kOk) {
      return touchstoneStatus;
    }
  }

  return core::Status::kOk;
}

std::size_t VnaControlService::InstanceCount() const {
  return runtime_.InstanceCount();
}

std::size_t VnaControlService::ActiveLeaseCount() const {
  return runtime_.ActiveLeaseCount();
}

}  // namespace service
}  // namespace vna
