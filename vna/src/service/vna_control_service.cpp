#include "service/vna_control_service.h"

#include <algorithm>
#include <chrono>
#include <cctype>
#include <vector>

#include "core/acquisition_comparator.h"
#include "core/measurement_exporter.h"
#include "core/topology_manager.h"

namespace vna {
namespace service {

namespace {

const std::uint32_t kDefaultSampleCount = 32;
const std::uint32_t kDefaultTimeoutMs = 1000;

}  // namespace

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

VnaControlService::VnaControlService()
  : runtime_(), started_(false), deEmbeddingEnabled_(false) {}

std::uint64_t VnaControlService::NowMs() {
  return static_cast<std::uint64_t>(
      std::chrono::duration_cast<std::chrono::milliseconds>(
          std::chrono::system_clock::now().time_since_epoch())
          .count());
}

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

core::Status VnaControlService::UpsertWorkspaceTopology(const std::string& workspaceId,
                                                        const core::Topology& topology,
                                                        bool activate,
                                                        TopologyValidationReport* validationReport) {
  if (workspaceId.empty()) {
    return core::Status::kInvalidArgument;
  }

  const TopologyValidationReport report = ValidateTopologyStructured(topology);
  if (validationReport != nullptr) {
    *validationReport = report;
  }
  if (!report.ok) {
    return core::Status::kInvalidArgument;
  }

  WorkspaceTopologyConfig config;
  config.workspaceId = workspaceId;
  config.topology = topology;
  config.updatedAtMs = NowMs();

  std::lock_guard<std::mutex> lock(workspaceTopologyMutex_);
  workspaceTopologies_[workspaceId] = config;

  if (activate || activeWorkspaceId_.empty()) {
    for (std::map<std::string, WorkspaceTopologyConfig>::iterator it = workspaceTopologies_.begin();
         it != workspaceTopologies_.end();
         ++it) {
      it->second.isActive = false;
    }
    workspaceTopologies_[workspaceId].isActive = true;
    activeWorkspaceId_ = workspaceId;
  }

  return core::Status::kOk;
}

core::Status VnaControlService::GetWorkspaceTopology(const std::string& workspaceId,
                                                     WorkspaceTopologyConfig& outConfig) const {
  if (workspaceId.empty()) {
    return core::Status::kInvalidArgument;
  }

  std::lock_guard<std::mutex> lock(workspaceTopologyMutex_);
  const std::map<std::string, WorkspaceTopologyConfig>::const_iterator it =
      workspaceTopologies_.find(workspaceId);
  if (it == workspaceTopologies_.end()) {
    return core::Status::kInvalidArgument;
  }

  outConfig = it->second;
  return core::Status::kOk;
}

std::vector<WorkspaceTopologyConfig> VnaControlService::ListWorkspaceTopologies() const {
  std::vector<WorkspaceTopologyConfig> result;
  std::lock_guard<std::mutex> lock(workspaceTopologyMutex_);
  result.reserve(workspaceTopologies_.size());

  for (std::map<std::string, WorkspaceTopologyConfig>::const_iterator it = workspaceTopologies_.begin();
       it != workspaceTopologies_.end();
       ++it) {
    result.push_back(it->second);
  }

  std::sort(result.begin(), result.end(), [](const WorkspaceTopologyConfig& left,
                                             const WorkspaceTopologyConfig& right) {
    return left.workspaceId < right.workspaceId;
  });

  return result;
}

core::Status VnaControlService::SetActiveWorkspace(const std::string& workspaceId) {
  if (workspaceId.empty()) {
    return core::Status::kInvalidArgument;
  }

  std::lock_guard<std::mutex> lock(workspaceTopologyMutex_);
  const std::map<std::string, WorkspaceTopologyConfig>::iterator target =
      workspaceTopologies_.find(workspaceId);
  if (target == workspaceTopologies_.end()) {
    return core::Status::kInvalidArgument;
  }

  for (std::map<std::string, WorkspaceTopologyConfig>::iterator it = workspaceTopologies_.begin();
       it != workspaceTopologies_.end();
       ++it) {
    it->second.isActive = false;
  }

  target->second.isActive = true;
  target->second.updatedAtMs = NowMs();
  activeWorkspaceId_ = workspaceId;
  return core::Status::kOk;
}

TopologyPrecheckResult VnaControlService::PrecheckWorkspaceTopology(
    const TopologyPrecheckRequest& request,
    const ResourceBrokerService* brokerService) const {
  TopologyPrecheckResult result;

  if (request.workspaceId.empty()) {
    result.ok = false;
    result.code = "INVALID_ARGUMENT";
    result.message = "workspace_id is required";
    return result;
  }

  const TopologyValidationReport report = ValidateTopologyStructured(request.topology);
  if (!report.ok) {
    result.ok = false;
    result.code = "TOPOLOGY_INVALID";
    result.message = "topology validation failed";
    result.topologyErrors = report.errors;
    return result;
  }

  if (request.destructiveChange && started_) {
    result.ok = false;
    result.code = "TOPOLOGY_DESTRUCTIVE_WHILE_RUNNING";
    result.message = "destructive topology change is blocked while measurement is running";
    return result;
  }

  if (brokerService != nullptr && !request.requiredResources.empty()) {
    std::vector<LockConflictDetail> conflicts;
    if (brokerService->HasActiveConflicts(request.requiredResources, request.requester, conflicts)) {
      result.ok = false;
      result.code = "LOCK_CONFLICT";
      result.message = "required resources are occupied";
      result.lockConflicts = conflicts;
      return result;
    }
  }

  result.ok = true;
  result.code = "OK";
  result.message = "precheck passed";
  return result;
}

std::string VnaControlService::GetActiveWorkspaceId() const {
  std::lock_guard<std::mutex> lock(workspaceTopologyMutex_);
  return activeWorkspaceId_;
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
  const core::Status status = runtime_.ApplyTopology(topology, workspaceId, defaultLeaseTtlSeconds);
  if (status != core::Status::kOk) {
    return status;
  }

  WorkspaceTopologyConfig config;
  config.workspaceId = workspaceId;
  config.topology = topology;
  config.isActive = true;
  config.updatedAtMs = NowMs();

  std::lock_guard<std::mutex> lock(workspaceTopologyMutex_);
  workspaceTopologies_[workspaceId] = config;
  activeWorkspaceId_ = workspaceId;
  return core::Status::kOk;
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

  const std::uint32_t effectiveSampleCount = sampleCount == 0 ? kDefaultSampleCount : sampleCount;
  const std::uint32_t effectiveTimeoutMs = timeoutMs == 0 ? kDefaultTimeoutMs : timeoutMs;

  const core::Status acquireStatus =
      runtime_.AcquireOnce(instanceId, excitation, effectiveSampleCount, effectiveTimeoutMs, out);
  if (acquireStatus != core::Status::kOk) {
    return acquireStatus;
  }

  if (deEmbeddingEnabled_) {
    if (out.dataType != core::AcquisitionDataType::kFrequencyDomain ||
        out.sParameters.points.empty()) {
      return core::Status::kOk;
    }

    if (!deEmbeddingFrequencyProfiles_.empty()) {
      return deEmbeddingProcessor_.ApplyFrequencyDependentDiagonalFixtureCompensation(
          out.sParameters, deEmbeddingFrequencyProfiles_);
    }
    return deEmbeddingProcessor_.ApplyDiagonalFixtureCompensation(
        out.sParameters, deEmbeddingPortTransfer_);
  }

  return core::Status::kOk;
}

core::Status VnaControlService::GetInstanceCapabilities(const std::string& instanceId,
                                                        core::HardwareCapabilities& out) const {
  return runtime_.GetInstanceCapabilities(instanceId, out);
}

core::Status VnaControlService::SetDeEmbeddingPortTransfer(
    const std::vector<std::complex<double> >& portTransfer) {
  if (portTransfer.empty()) {
    return core::Status::kInvalidArgument;
  }

  for (std::size_t i = 0; i < portTransfer.size(); ++i) {
    if (std::abs(portTransfer[i]) <= 1e-15) {
      return core::Status::kInvalidArgument;
    }
  }

  deEmbeddingPortTransfer_ = portTransfer;
  deEmbeddingFrequencyProfiles_.clear();
  return core::Status::kOk;
}

core::Status VnaControlService::SetDeEmbeddingFrequencyPortTransferProfiles(
    const std::vector<core::processors::FrequencyPortTransferProfile>& profiles) {
  if (profiles.empty()) {
    return core::Status::kInvalidArgument;
  }

  for (std::size_t i = 0; i < profiles.size(); ++i) {
    if (profiles[i].frequencyHz <= 0.0 || profiles[i].portTransfer.empty()) {
      return core::Status::kInvalidArgument;
    }
    for (std::size_t j = 0; j < profiles[i].portTransfer.size(); ++j) {
      if (std::abs(profiles[i].portTransfer[j]) <= 1e-15) {
        return core::Status::kInvalidArgument;
      }
    }
  }

  deEmbeddingFrequencyProfiles_ = profiles;
  deEmbeddingPortTransfer_.clear();
  return core::Status::kOk;
}

void VnaControlService::SetDeEmbeddingEnabled(bool enabled) {
  deEmbeddingEnabled_ = enabled;
}

std::string VnaControlService::BuildDeEmbeddingContextTag() const {
  if (!deEmbeddingEnabled_) {
    return "deembedding=off";
  }

  if (!deEmbeddingFrequencyProfiles_.empty()) {
    return "deembedding=on,mode=frequency,profile_count=" +
        std::to_string(deEmbeddingFrequencyProfiles_.size());
  }

  if (!deEmbeddingPortTransfer_.empty()) {
    return "deembedding=on,mode=global,port_count=" +
        std::to_string(deEmbeddingPortTransfer_.size());
  }

  return "deembedding=on,mode=unconfigured";
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
  const std::string deEmbeddingTag = BuildDeEmbeddingContextTag();
  if (tolerance <= 0.0) {
    if (diffMessage != nullptr) {
      *diffMessage = "COMPARE_TOLERANCE_INVALID: tolerance must be > 0, " + deEmbeddingTag;
    }
    return core::Status::kInvalidArgument;
  }

  core::AcquisitionResult imported;
  std::string importError;
  const core::Status importStatus = ImportAcquisitionResult(jsonPath, imported, &importError);
  if (importStatus != core::Status::kOk) {
    if (diffMessage != nullptr) {
      *diffMessage = importError + ", " + deEmbeddingTag;
    }
    return importStatus;
  }

  std::string mismatch;
  const bool same = core::AcquisitionComparator::AreEquivalentForReplay(
      imported, current, tolerance, &mismatch);
  if (!same) {
    if (diffMessage != nullptr) {
      const std::string mismatchDetail =
          mismatch.find("COMPARE_MISMATCH:") == 0 ? mismatch : "COMPARE_MISMATCH: " + mismatch;
      *diffMessage = mismatchDetail + ", " + deEmbeddingTag;
    }
    return core::Status::kInvalidArgument;
  }

  if (diffMessage != nullptr) {
    const std::string matchDetail = mismatch.empty() ? "COMPARE_MATCHED" : mismatch;
    *diffMessage = matchDetail + ", " + deEmbeddingTag;
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
