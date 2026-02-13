#include <cassert>
#include <fstream>
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
    }
    assert(hasTabIndentError);
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

    assert(service.Start() == vna::core::Status::kOk);
    assert(service.ActiveLeaseCount() == 1);

    vna::core::ExcitationConfig excitation;
    excitation.mode = vna::core::ExcitationMode::kContinuousWave;
    excitation.cw.frequencyHz = 1.0e9;
    excitation.cw.powerDbm = -10.0;

    vna::core::AcquisitionResult result;
    assert(service.AcquireOnce("inst0", excitation, 32, 1000, result) == vna::core::Status::kOk);
    assert(result.instanceId == "inst0");

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
    assert(missingImportError == "import requires non-empty json path");

    assert(service.Stop() == vna::core::Status::kOk);
    assert(service.ActiveLeaseCount() == 0);
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
