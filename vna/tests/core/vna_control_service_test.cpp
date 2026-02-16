#include <algorithm>
#include <cassert>
#include <cmath>
#include <complex>
#include <fstream>
#include <limits>
#include <string>

#include "core/built_in_drivers.h"
#include "service/vna_control_service.h"

int main() {
  vna::core::RegisterBuiltInDrivers();

  vna::service::VnaControlService service;

  // ValidateTopology should fail on empty yaml.
  {
    vna::core::Topology invalid;
    invalid.id = "";
    invalid.yaml = "";

    const vna::core::ValidationResult vr = service.ValidateTopology(invalid);
    assert(!vr.ok);
    assert(!vr.errors.empty());

    const vna::service::TopologyValidationReport structured =
        service.ValidateTopologyStructured(invalid);
    assert(!structured.ok);
    assert(structured.errors.size() == 2);
    assert(structured.errors[0].code == "TOPOLOGY_ID_REQUIRED");
    assert(structured.errors[0].field == "topology.id");
    assert(structured.errors[1].code == "TOPOLOGY_YAML_EMPTY");
    assert(structured.errors[1].field == "topology.yaml");
  }

  // Structured errors should map known topology format issues.
  {
    vna::core::Topology invalid;
    invalid.id = "t_tab";
    invalid.yaml =
        "instances:\n"
        "\t- id: inst0\n";

    const vna::service::TopologyValidationReport structured =
        service.ValidateTopologyStructured(invalid);
    assert(!structured.ok);

    bool hasTabIndentError = false;
    for (std::size_t i = 0; i < structured.errors.size(); ++i) {
      if (structured.errors[i].code == "TOPOLOGY_YAML_TAB_INDENT") {
        hasTabIndentError = true;
        assert(structured.errors[i].field == "topology.yaml");
      }

  // Precheck should detect active lock conflicts before workspace save/activate.
  {
    vna::service::ResourceBrokerService broker;

    vna::service::LockAcquireRequest lockReq;
    lockReq.selector.type = vna::service::LockResourceType::kPhysicalDevice;
    lockReq.selector.resourceId = "dev-precheck-0";
    lockReq.owner.workspaceId = "workspace-lock-holder";
    lockReq.owner.sessionId = "sess-holder";
    lockReq.owner.actor = "holder";
    lockReq.mode = vna::service::LockMode::kExclusive;
    lockReq.ttlSeconds = 3;

    vna::service::LockAcquireResult lockResult;
    assert(broker.AcquireLock(lockReq, lockResult) == vna::core::Status::kOk);

    vna::service::TopologyPrecheckRequest precheck;
    precheck.workspaceId = "workspace-a";
    precheck.topology.id = "topo-precheck";
    precheck.topology.yaml =
        "instances:\n"
        "  - id: inst0\n"
        "    driver: pxi\n"
        "    device: pxi-mock-0\n"
        "    resource: dev-precheck-0\n";
    precheck.requiredResources.push_back(lockReq.selector);
    precheck.requester.workspaceId = "workspace-a";
    precheck.requester.sessionId = "sess-a";
    precheck.requester.actor = "editor-a";

    const vna::service::TopologyPrecheckResult precheckResult =
        service.PrecheckWorkspaceTopology(precheck, &broker);
    assert(!precheckResult.ok);
    assert(precheckResult.code == "LOCK_CONFLICT");
    assert(!precheckResult.lockConflicts.empty());
    assert(precheckResult.lockConflicts[0].holderOwner.workspaceId == "workspace-lock-holder");
  }
    }
    assert(hasTabIndentError);
  }

      // Workspace topology configs should be independently managed and activatable.
      {
        vna::core::Topology topoA;
        topoA.id = "ws-topo-a";
        topoA.yaml =
       "instances:\n"
       "  - id: inst0\n"
       "    driver: pxi\n"
       "    device: pxi-mock-0\n"
       "    resource: dev0\n";

        vna::service::TopologyValidationReport reportA;
        assert(service.UpsertWorkspaceTopology("workspace-a", topoA, true, &reportA) ==
          vna::core::Status::kOk);
        assert(reportA.ok);

        vna::core::Topology topoB;
        topoB.id = "ws-topo-b";
        topoB.yaml =
       "instances:\n"
       "  - id: inst1\n"
       "    driver: usb\n"
       "    device: usb-mock-1\n"
       "    resource: dev1\n";

        vna::service::TopologyValidationReport reportB;
        assert(service.UpsertWorkspaceTopology("workspace-b", topoB, false, &reportB) ==
          vna::core::Status::kOk);
        assert(reportB.ok);

        std::vector<vna::service::WorkspaceTopologyConfig> listed = service.ListWorkspaceTopologies();
        assert(listed.size() == 2);
        assert(service.GetActiveWorkspaceId() == "workspace-a");

        vna::service::WorkspaceTopologyConfig loaded;
        assert(service.GetWorkspaceTopology("workspace-b", loaded) == vna::core::Status::kOk);
        assert(loaded.workspaceId == "workspace-b");
        assert(loaded.topology.id == "ws-topo-b");
        assert(!loaded.isActive);

        assert(service.SetActiveWorkspace("workspace-b") == vna::core::Status::kOk);
        assert(service.GetActiveWorkspaceId() == "workspace-b");

        assert(service.GetWorkspaceTopology("missing-workspace", loaded) ==
          vna::core::Status::kInvalidArgument);
      }

  // Apply -> Start -> Acquire -> Stop happy path.
  {
    vna::core::Topology topology;
    topology.id = "t1";
    topology.yaml =
        "instances:\n"
        "  - id: inst0\n"
        "    driver: pxi\n"
        "    device: pxi-mock-0\n"
        "    resource: dev0\n";

    assert(service.ApplyTopology(topology, "ws0", 2) == vna::core::Status::kOk);
    assert(service.InstanceCount() == 1);

    vna::core::HardwareCapabilities caps;
    assert(service.GetInstanceCapabilities("inst0", caps) == vna::core::Status::kOk);
    assert(caps.supportsPulseExcitation);
    assert(caps.supportsMultiTone);
    assert(caps.supportsExternalClock);
    assert(caps.minPulseWidthNs > 0);
    assert(caps.maxSamplingRateGhz > 0.0);

    assert(service.GetInstanceCapabilities("missing-inst", caps) == vna::core::Status::kInvalidArgument);

    assert(service.Start() == vna::core::Status::kOk);
    assert(service.ActiveLeaseCount() == 1);

    vna::core::ExcitationConfig excitation;
    excitation.mode = vna::core::ExcitationMode::kContinuousWave;
    excitation.cw.frequencyHz = 1.0e9;
    excitation.cw.startFrequencyHz = 0.95e9;
    excitation.cw.stopFrequencyHz = 1.05e9;
    excitation.cw.sweepPointCount = 32;
    excitation.cw.powerDbm = -10.0;

    vna::core::AcquisitionResult result;
    assert(service.AcquireOnce("inst0", excitation, 32, 1000, result) == vna::core::Status::kOk);
    assert(result.instanceId == "inst0");
    assert(result.frequencyDomain.frequenciesHz.size() == 32);
    assert(result.frequencyDomain.samples.size() == 32);
    double minMagnitude = std::numeric_limits<double>::infinity();
    double maxMagnitude = 0.0;
    for (const std::complex<double>& sample : result.frequencyDomain.samples) {
      const double magnitude = std::abs(sample);
      minMagnitude = std::min(minMagnitude, magnitude);
      maxMagnitude = std::max(maxMagnitude, magnitude);
    }
    assert(maxMagnitude > minMagnitude + 1e-4);

    // sample_count/timeout_ms 默认化：传 0 时应回退为服务默认值并成功采集。
    vna::core::AcquisitionResult defaultedResult;
    assert(service.AcquireOnce("inst0", excitation, 0, 0, defaultedResult) == vna::core::Status::kOk);
    assert(defaultedResult.instanceId == "inst0");
    assert(defaultedResult.frequencyDomain.frequenciesHz.size() == 32);
    assert(defaultedResult.frequencyDomain.samples.size() == 32);

        std::vector<std::complex<double> > invalidTransfer;
        invalidTransfer.push_back(std::complex<double>(1.0, 0.0));
        assert(service.SetDeEmbeddingPortTransfer(invalidTransfer) == vna::core::Status::kOk);
        service.SetDeEmbeddingEnabled(true);

        vna::core::AcquisitionResult deembedInvalidResult;
        assert(service.AcquireOnce("inst0", excitation, 32, 1000, deembedInvalidResult) ==
          vna::core::Status::kInvalidArgument);

        std::vector<std::complex<double> > validTransfer;
        const std::size_t portCount = result.sParameters.points.empty()
            ? 0
            : static_cast<std::size_t>(result.sParameters.points[0].portCount);
        assert(portCount > 0);
        for (std::size_t i = 0; i < portCount; ++i) {
          validTransfer.push_back(std::complex<double>(1.0, 0.0));
        }
        assert(service.SetDeEmbeddingPortTransfer(validTransfer) == vna::core::Status::kOk);

        std::vector<vna::core::processors::FrequencyPortTransferProfile> profiles;
        vna::core::processors::FrequencyPortTransferProfile p0;
        p0.frequencyHz = result.sParameters.points[0].frequencyHz;
        for (std::size_t i = 0; i < portCount; ++i) {
          p0.portTransfer.push_back(std::complex<double>(2.0, 0.0));
        }
        profiles.push_back(p0);
        assert(service.SetDeEmbeddingFrequencyPortTransferProfiles(profiles) == vna::core::Status::kOk);

        vna::core::AcquisitionResult deembedValidResult;
        assert(service.AcquireOnce("inst0", excitation, 32, 1000, deembedValidResult) ==
          vna::core::Status::kOk);
        assert(!deembedValidResult.sParameters.points.empty());
        const std::complex<double> rawS11 = result.sParameters.points[0].matrix[0];
        const std::complex<double> deembeddedS11 = deembedValidResult.sParameters.points[0].matrix[0];
        assert(std::abs(rawS11) > 1e-12);
        assert(std::abs(deembeddedS11) < std::abs(rawS11));
        service.SetDeEmbeddingEnabled(false);

    const std::string csvPath = "build/vna-control-service-export.csv";
    const std::string touchstonePath = "build/vna-control-service-export.s2p";
        const std::string jsonPath = "build/vna-control-service-export.json";
        assert(service.ExportAcquisitionResult(result, csvPath, touchstonePath, jsonPath) ==
          vna::core::Status::kOk);

    std::ifstream csvFile(csvPath.c_str());
    std::ifstream touchstoneFile(touchstonePath.c_str());
        std::ifstream jsonFile(jsonPath.c_str());
    assert(csvFile.good());
    assert(touchstoneFile.good());
        assert(jsonFile.good());

    vna::core::AcquisitionResult imported;
    std::string importError;
    assert(service.ImportAcquisitionResult(jsonPath, imported, &importError) == vna::core::Status::kOk);
    assert(importError.empty());
    assert(imported.instanceId == result.instanceId);
    assert(imported.timestampNs == result.timestampNs);
    assert(imported.receiverRaw.points.size() == result.receiverRaw.points.size());
    assert(imported.sParameters.points.size() == result.sParameters.points.size());

        std::string compareDiff;
        assert(service.CompareImportedAcquisition(jsonPath, result, 1e-6, &compareDiff) ==
          vna::core::Status::kOk);
        assert(compareDiff.find("COMPARE_MATCHED:") == 0);
        assert(compareDiff.find("deembedding=off") != std::string::npos);
        assert(compareDiff.find("tolerance=") != std::string::npos);
        assert(compareDiff.find("summary_version=") != std::string::npos);
        assert(compareDiff.find("summary_schema=") != std::string::npos);
        assert(compareDiff.find("summary_compat=") != std::string::npos);
        assert(compareDiff.find("summary_token=") != std::string::npos);
        assert(compareDiff.find("summary_primary_profile=") != std::string::npos);
        assert(compareDiff.find("summary_health_level=") != std::string::npos);
        assert(compareDiff.find("receiver_raw_samples=") != std::string::npos);
        assert(compareDiff.find("max_component_delta=") != std::string::npos);
        assert(compareDiff.find("max_component_delta_ratio=") != std::string::npos);
        assert(compareDiff.find("max_component_risk_level=") != std::string::npos);
        assert(compareDiff.find("max_component_tolerance_margin=") != std::string::npos);
        assert(compareDiff.find("rms_component_delta_ratio=") != std::string::npos);
        assert(compareDiff.find("rms_component_risk_level=") != std::string::npos);
        assert(compareDiff.find("rms_component_tolerance_margin=") != std::string::npos);
        assert(compareDiff.find("overall_digest=") != std::string::npos);
        assert(compareDiff.find("receiver_raw_rms_delta=") != std::string::npos);
        assert(compareDiff.find("receiver_comp_rms_delta=") != std::string::npos);
        assert(compareDiff.find("sparameter_rms_delta=") != std::string::npos);
        assert(compareDiff.find("receiver_raw_rms_delta_ratio=") != std::string::npos);
        assert(compareDiff.find("sparameter_rms_delta_ratio=") != std::string::npos);
        assert(compareDiff.find("receiver_raw_max_at=point:") != std::string::npos);
        assert(compareDiff.find("sparameter_max_at=point:") != std::string::npos);
        assert(compareDiff.find("receiver_raw_max_component=") != std::string::npos);
        assert(compareDiff.find("sparameter_max_component=") != std::string::npos);
        assert(compareDiff.find("receiver_raw_max_component_margin=") != std::string::npos);
        assert(compareDiff.find("sparameter_max_component_margin=") != std::string::npos);
        assert(compareDiff.find("receiver_raw_max_frequency_hz=") != std::string::npos);
        assert(compareDiff.find("sparameter_max_frequency_hz=") != std::string::npos);
        assert(compareDiff.find("receiver_raw_total_points=") != std::string::npos);
        assert(compareDiff.find("sparameter_total_points=") != std::string::npos);
        assert(compareDiff.find("receiver_raw_max_point_ratio=") != std::string::npos);
        assert(compareDiff.find("receiver_raw_max_point_zone=") != std::string::npos);
        assert(compareDiff.find("sparameter_max_point_ratio=") != std::string::npos);
        assert(compareDiff.find("sparameter_max_point_zone=") != std::string::npos);
        assert(compareDiff.find("receiver_raw_max_delta_ratio=") != std::string::npos);
        assert(compareDiff.find("receiver_raw_max_risk_level=") != std::string::npos);
        assert(compareDiff.find("receiver_raw_max_tolerance_margin=") != std::string::npos);
        assert(compareDiff.find("receiver_raw_max_profile=") != std::string::npos);
        assert(compareDiff.find("receiver_raw_digest=") != std::string::npos);
        assert(compareDiff.find("sparameter_max_delta_ratio=") != std::string::npos);
        assert(compareDiff.find("sparameter_max_risk_level=") != std::string::npos);
        assert(compareDiff.find("sparameter_max_tolerance_margin=") != std::string::npos);
        assert(compareDiff.find("sparameter_max_profile=") != std::string::npos);
        assert(compareDiff.find("sparameter_digest=") != std::string::npos);
        assert(compareDiff.find("receiver_raw_max_signed_delta=") != std::string::npos);
        assert(compareDiff.find("sparameter_max_signed_delta=") != std::string::npos);
        assert(compareDiff.find("receiver_raw_max_real_delta=") != std::string::npos);
        assert(compareDiff.find("receiver_raw_max_imag_delta=") != std::string::npos);
        assert(compareDiff.find("sparameter_max_real_delta=") != std::string::npos);
        assert(compareDiff.find("sparameter_max_imag_delta=") != std::string::npos);
        assert(compareDiff.find("worst_category=") != std::string::npos);
        assert(compareDiff.find("worst_max_delta_ratio=") != std::string::npos);
        assert(compareDiff.find("worst_max_risk_level=") != std::string::npos);
        assert(compareDiff.find("worst_max_tolerance_margin=") != std::string::npos);
        assert(compareDiff.find("worst_max_component_margin=") != std::string::npos);
        assert(compareDiff.find("worst_max_frequency_hz=") != std::string::npos);
        assert(compareDiff.find("worst_total_points=") != std::string::npos);
        assert(compareDiff.find("worst_max_point_ratio=") != std::string::npos);
        assert(compareDiff.find("worst_max_point_zone=") != std::string::npos);
        assert(compareDiff.find("worst_max_profile=") != std::string::npos);
        assert(compareDiff.find("worst_digest=") != std::string::npos);

        const std::size_t receiverRawDigestPos = compareDiff.find("receiver_raw_digest=");
        const std::size_t receiverCompDigestPos = compareDiff.find("receiver_comp_digest=");
        const std::size_t sParameterDigestPos = compareDiff.find("sparameter_digest=");
        const std::size_t worstDigestPos = compareDiff.find("worst_digest=");
        const std::size_t overallDigestPos = compareDiff.find("overall_digest=");
        assert(receiverRawDigestPos < receiverCompDigestPos);
        assert(receiverCompDigestPos < sParameterDigestPos);
        assert(sParameterDigestPos < worstDigestPos);
        assert(worstDigestPos < overallDigestPos);
        assert(compareDiff.find("worst_max_real_delta=") != std::string::npos);
        assert(compareDiff.find("worst_max_imag_delta=") != std::string::npos);
        assert(compareDiff.find("worst_max_at=point:") != std::string::npos);
        assert(compareDiff.find("worst_expected_real=") != std::string::npos);
        assert(compareDiff.find("worst_actual_real=") != std::string::npos);
        assert(compareDiff.find("receiver_raw_max_expected_real=") != std::string::npos);
        assert(compareDiff.find("receiver_raw_max_actual_real=") != std::string::npos);
        assert(compareDiff.find("sparameter_max_expected_real=") != std::string::npos);
        assert(compareDiff.find("sparameter_max_actual_real=") != std::string::npos);

         service.SetDeEmbeddingEnabled(true);
         std::string deembedCompare;
         assert(service.CompareImportedAcquisition(jsonPath, result, 1e-6, &deembedCompare) ==
           vna::core::Status::kOk);
         assert(deembedCompare.find("deembedding=on,mode=frequency") != std::string::npos);

         vna::core::ExcitationConfig pulseExcitation;
         pulseExcitation.mode = vna::core::ExcitationMode::kPulse;
         pulseExcitation.pulse.centerFrequencyHz = 1.0e9;
         pulseExcitation.pulse.powerDbm = -5.0;
         pulseExcitation.pulse.pulseWidthNs = 20.0;
         pulseExcitation.pulse.pulsePeriodNs = 100.0;
         pulseExcitation.pulse.riseTimeNs = 2.0;
         vna::core::AcquisitionResult pulseResult;
         assert(service.AcquireOnce("inst0", pulseExcitation, 32, 1000, pulseResult) ==
           vna::core::Status::kOk);
         assert(pulseResult.dataType == vna::core::AcquisitionDataType::kTimeDomain);
         assert(pulseResult.timeDomain.magnitude.size() == 32);

         service.SetDeEmbeddingEnabled(false);

        vna::core::AcquisitionResult altered = result;
        altered.sParameters.points[0].matrix[0] = std::complex<double>(123.0, 456.0);
        assert(service.CompareImportedAcquisition(jsonPath, altered, 1e-9, &compareDiff) ==
          vna::core::Status::kInvalidArgument);
        assert(compareDiff.find("COMPARE_MISMATCH:") != std::string::npos);
        assert(compareDiff.find("delta=") != std::string::npos);
        assert(compareDiff.find("deembedding=off") != std::string::npos);

    std::string exportError;
    const vna::core::Status invalidExportStatus = service.ExportAcquisitionResult(
      result,
      "Z:/definitely-not-exist/wu46-invalid.csv",
      "",
      "",
      &exportError);
    assert(invalidExportStatus == vna::core::Status::kInvalidArgument);
    assert(!exportError.empty());
    const bool csvOpenFailed =
      exportError.find("failed to open csv output path") != std::string::npos;
    const bool csvDirFailed =
      exportError.find("failed to create csv output directory") != std::string::npos;
    assert(csvOpenFailed || csvDirFailed);

    std::string missingImportError;
    vna::core::AcquisitionResult missingImported;
    assert(service.ImportAcquisitionResult("", missingImported, &missingImportError) ==
           vna::core::Status::kInvalidArgument);
        assert(missingImportError == "IMPORT_PATH_EMPTY: import requires non-empty json path");

        std::string invalidExtError;
        assert(service.ImportAcquisitionResult("build/not-json.txt", missingImported, &invalidExtError) ==
          vna::core::Status::kInvalidArgument);
        assert(invalidExtError == "IMPORT_PATH_EXTENSION: json_path must end with .json");

        std::string absolutePathError;
        assert(service.ImportAcquisitionResult("C:/tmp/data.json", missingImported, &absolutePathError) ==
          vna::core::Status::kInvalidArgument);
        assert(absolutePathError ==
          "IMPORT_PATH_ABSOLUTE: only workspace-relative json_path is allowed");

        std::string traversalError;
        assert(service.ImportAcquisitionResult("../outside/data.json", missingImported, &traversalError) ==
          vna::core::Status::kInvalidArgument);
        assert(traversalError ==
          "IMPORT_PATH_TRAVERSAL: parent traversal is not allowed in json_path");

            std::string invalidTolerance;
            assert(service.CompareImportedAcquisition(jsonPath, result, 0.0, &invalidTolerance) ==
              vna::core::Status::kInvalidArgument);
            assert(invalidTolerance.find("COMPARE_TOLERANCE_INVALID: tolerance must be > 0") == 0);

    assert(service.Stop() == vna::core::Status::kOk);
    assert(service.ActiveLeaseCount() == 0);
  }

  // Precheck should block destructive topology change while runtime is started.
  {
    vna::service::VnaControlService runningService;

    vna::core::Topology topology;
    topology.id = "t_precheck_running";
    topology.yaml =
        "instances:\n"
        "  - id: inst0\n"
        "    driver: pxi\n"
        "    device: pxi-mock-0\n"
        "    resource: dev0\n";

    assert(runningService.ApplyTopology(topology, "ws-running", 2) == vna::core::Status::kOk);
    assert(runningService.Start() == vna::core::Status::kOk);

    vna::service::TopologyPrecheckRequest destructive;
    destructive.workspaceId = "ws-running";
    destructive.topology = topology;
    destructive.destructiveChange = true;

    const vna::service::TopologyPrecheckResult destructiveResult =
        runningService.PrecheckWorkspaceTopology(destructive, nullptr);
    assert(!destructiveResult.ok);
    assert(destructiveResult.code == "TOPOLOGY_DESTRUCTIVE_WHILE_RUNNING");

    assert(runningService.Stop() == vna::core::Status::kOk);
  }

  // Acquire before Start should fail.
  {
    vna::service::VnaControlService s2;
    vna::core::AcquisitionResult out;
    vna::core::ExcitationConfig excitation;
    excitation.mode = vna::core::ExcitationMode::kContinuousWave;

    assert(s2.AcquireOnce("inst0", excitation, 1, 1, out) == vna::core::Status::kInvalidArgument);
  }

  // Resource contention should fail Start and not leak leases.
  {
    vna::service::VnaControlService s3;

    vna::core::Topology topology;
    topology.id = "t_conflict";
    topology.yaml =
        "instances:\n"
        "  - id: inst0\n"
        "    driver: pxi\n"
        "    device: pxi-mock-0\n"
        "    resource: dev0\n"
        "  - id: inst1\n"
        "    driver: usb\n"
        "    device: usb-mock-0\n"
        "    resource: dev0\n";

    assert(s3.ApplyTopology(topology, "ws0", 2) == vna::core::Status::kOk);
    assert(s3.Start() == vna::core::Status::kTimeout);
    assert(s3.ActiveLeaseCount() == 0);

    assert(s3.Stop() == vna::core::Status::kOk);
  }

  return 0;
}
