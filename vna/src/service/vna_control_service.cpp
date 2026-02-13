#include "service/vna_control_service.h"

#include <cctype>
#include <vector>

#include "core/acquisition_comparator.h"
#include "core/measurement_exporter.h"
#include "core/topology_manager.h"

namespace vna {
namespace service {

namespace {

bool EndsWithJson(const std::string& path) {
  if (path.size() < 5) {
    return false;
  }

  const std::size_t offset = path.size() - 5;
  return std::tolower(static_cast<unsigned char>(path[offset])) == '.' &&
         std::tolower(static_cast<unsigned char>(path[offset + 1])) == 'j' &&
         std::tolower(static_cast<unsigned char>(path[offset + 2])) == 's' &&
         std::tolower(static_cast<unsigned char>(path[offset + 3])) == 'o' &&
         std::tolower(static_cast<unsigned char>(path[offset + 4])) == 'n';
}

bool IsAbsolutePath(const std::string& path) {
  if (path.empty()) {
    return false;
  }

  if (path[0] == '/' || path[0] == '\\') {
    return true;
  }

  return path.size() >= 2 && path[1] == ':';
}

bool HasParentTraversal(const std::string& path) {
  if (path == "..") {
    return true;
  }

  if (path.find("../") != std::string::npos ||
      path.find("..\\") != std::string::npos ||
      path.find("/..") != std::string::npos ||
      path.find("\\..") != std::string::npos) {
    return true;
  }

  return false;
}

}  // namespace

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
                                                       const std::string& touchstonePath,
                                                       const std::string& jsonPath,
                                                       std::string* errorMessage) {
  if (csvPath.empty() && touchstonePath.empty() && jsonPath.empty()) {
    if (errorMessage != nullptr) {
      *errorMessage = "export requires at least one output path";
    }
    return core::Status::kInvalidArgument;
  }

  if (!csvPath.empty()) {
    const core::Status csvStatus = core::MeasurementExporter::ExportCsv(result, csvPath, errorMessage);
    if (csvStatus != core::Status::kOk) {
      return csvStatus;
    }
  }

  if (!touchstonePath.empty()) {
    const core::Status touchstoneStatus =
        core::MeasurementExporter::ExportTouchstone(result, touchstonePath, errorMessage);
    if (touchstoneStatus != core::Status::kOk) {
      return touchstoneStatus;
    }
  }

  if (!jsonPath.empty()) {
    const core::Status jsonStatus =
        core::MeasurementExporter::ExportJson(result, jsonPath, errorMessage);
    if (jsonStatus != core::Status::kOk) {
      return jsonStatus;
    }
  }

  if (errorMessage != nullptr) {
    errorMessage->clear();
  }
  return core::Status::kOk;
}

core::Status VnaControlService::ImportAcquisitionResult(const std::string& jsonPath,
                                                       core::AcquisitionResult& out,
                                                       std::string* errorMessage) {
  if (jsonPath.empty()) {
    if (errorMessage != nullptr) {
      *errorMessage = "IMPORT_PATH_EMPTY: import requires non-empty json path";
    }
    return core::Status::kInvalidArgument;
  }

  if (!EndsWithJson(jsonPath)) {
    if (errorMessage != nullptr) {
      *errorMessage = "IMPORT_PATH_EXTENSION: json_path must end with .json";
    }
    return core::Status::kInvalidArgument;
  }

  if (IsAbsolutePath(jsonPath)) {
    if (errorMessage != nullptr) {
      *errorMessage = "IMPORT_PATH_ABSOLUTE: only workspace-relative json_path is allowed";
    }
    return core::Status::kInvalidArgument;
  }

  if (HasParentTraversal(jsonPath)) {
    if (errorMessage != nullptr) {
      *errorMessage = "IMPORT_PATH_TRAVERSAL: parent traversal is not allowed in json_path";
    }
    return core::Status::kInvalidArgument;
  }

  return core::MeasurementExporter::ImportJson(jsonPath, out, errorMessage);
}

core::Status VnaControlService::CompareImportedAcquisition(const std::string& jsonPath,
                                                          const core::AcquisitionResult& current,
                                                          double tolerance,
                                                          std::string* diffMessage) {
  if (tolerance <= 0.0) {
    if (diffMessage != nullptr) {
      *diffMessage = "COMPARE_TOLERANCE_INVALID: tolerance must be > 0";
    }
    return core::Status::kInvalidArgument;
  }

  core::AcquisitionResult imported;
  std::string importError;
  const core::Status importStatus = ImportAcquisitionResult(jsonPath, imported, &importError);
  if (importStatus != core::Status::kOk) {
    if (diffMessage != nullptr) {
      *diffMessage = importError;
    }
    return importStatus;
  }

  std::string mismatch;
  const bool same = core::AcquisitionComparator::AreEquivalentForReplay(
      imported, current, tolerance, &mismatch);
  if (!same) {
    if (diffMessage != nullptr) {
      *diffMessage = mismatch.find("COMPARE_MISMATCH:") == 0 ? mismatch : "COMPARE_MISMATCH: " + mismatch;
    }
    return core::Status::kInvalidArgument;
  }

  if (diffMessage != nullptr) {
    *diffMessage = mismatch.empty() ? "COMPARE_MATCHED" : mismatch;
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
