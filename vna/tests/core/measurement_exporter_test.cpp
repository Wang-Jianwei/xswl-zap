#include <cassert>
#include <fstream>
#include <sstream>
#include <string>

#include "core/built_in_drivers.h"
#include "core/hardware_coordinator.h"
#include "core/hardware_driver_factory.h"
#include "core/measurement_exporter.h"
#include "core/measurement_pipeline.h"

namespace {

std::string ReadAll(const std::string& path) {
  std::ifstream in(path.c_str(), std::ios::in);
  std::stringstream buffer;
  buffer << in.rdbuf();
  return buffer.str();
}

}  // namespace

int main() {
  vna::core::RegisterBuiltInDrivers();

  std::unique_ptr<vna::core::HardwareDriver> driver =
      vna::core::HardwareDriverFactory::CreateDriver("pxi", "pxi-mock-0");
  assert(driver);

  vna::core::HardwareCoordinator coordinator;
  assert(coordinator.SetDriver(std::move(driver)) == vna::core::Status::kOk);
  assert(coordinator.Initialize() == vna::core::Status::kOk);

  vna::core::MeasurementPipeline pipeline(&coordinator);

  vna::core::ExcitationConfig excitation;
  excitation.mode = vna::core::ExcitationMode::kContinuousWave;
  excitation.cw.startFrequencyHz = 1.0e9;
  excitation.cw.stopFrequencyHz = 1.1e9;
  excitation.cw.sweepPointCount = 3;
  excitation.cw.frequencyHz = 1.0e9;
  excitation.cw.powerDbm = -5.0;
  excitation.cw.portCount = 4;
  excitation.cw.excitationPort = 2;

  vna::core::AcquisitionResult result;
  assert(pipeline.Acquire("inst0", excitation, 128, 1000, result) == vna::core::Status::kOk);

  const std::string csvPath = "build/measurement-exporter-test.csv";
  const std::string touchstonePath = "build/measurement-exporter-test.s4p";
  const std::string jsonPath = "build/measurement-exporter-test.json";
  const std::string nestedCsvPath = "build/wu48/export/measurement-exporter-test.csv";
  const std::string nestedTouchstonePath = "build/wu48/export/measurement-exporter-test.s4p";
  const std::string nestedJsonPath = "build/wu49/export/measurement-exporter-test.json";

  assert(vna::core::MeasurementExporter::ExportCsv(result, csvPath) == vna::core::Status::kOk);
  assert(vna::core::MeasurementExporter::ExportJson(result, jsonPath) == vna::core::Status::kOk);
  assert(vna::core::MeasurementExporter::ExportTouchstone(result, touchstonePath) ==
         vna::core::Status::kOk);
    assert(vna::core::MeasurementExporter::ExportCsv(result, nestedCsvPath) == vna::core::Status::kOk);
    assert(vna::core::MeasurementExporter::ExportJson(result, nestedJsonPath) == vna::core::Status::kOk);
    assert(vna::core::MeasurementExporter::ExportTouchstone(result, nestedTouchstonePath) ==
      vna::core::Status::kOk);

  const std::string csvText = ReadAll(csvPath);
  assert(csvText.find("data_product") != std::string::npos);
  assert(csvText.find("magnitude_db") != std::string::npos);
  assert(csvText.find("phase_deg") != std::string::npos);
  assert(csvText.find("receiver_raw") != std::string::npos);
  assert(csvText.find("s_parameter") != std::string::npos);

  const std::string touchstoneText = ReadAll(touchstonePath);
  assert(touchstoneText.find("# Hz S RI R 50") != std::string::npos);
  assert(touchstoneText.find("1000000000") != std::string::npos);

  const std::string jsonText = ReadAll(jsonPath);
  assert(jsonText.find("\"receiver_raw_points\"") != std::string::npos);
  assert(jsonText.find("\"receiver_compensated_points\"") != std::string::npos);
  assert(jsonText.find("\"s_parameter_points\"") != std::string::npos);

    vna::core::AcquisitionResult imported;
    std::string importError;
    assert(vna::core::MeasurementExporter::ImportJson(jsonPath, imported, &importError) ==
      vna::core::Status::kOk);
    assert(importError.empty());
    assert(imported.instanceId == result.instanceId);
    assert(imported.timestampNs == result.timestampNs);
    assert(imported.receiverRaw.points.size() == result.receiverRaw.points.size());
    assert(imported.receiverCompensated.points.size() == result.receiverCompensated.points.size());
    assert(imported.sParameters.points.size() == result.sParameters.points.size());
    assert(!imported.sParameters.points.empty());
    assert(imported.sParameters.points[0].portCount == result.sParameters.points[0].portCount);

  std::ifstream nestedCsvFile(nestedCsvPath.c_str());
  std::ifstream nestedTouchstoneFile(nestedTouchstonePath.c_str());
  std::ifstream nestedJsonFile(nestedJsonPath.c_str());
  assert(nestedCsvFile.good());
  assert(nestedTouchstoneFile.good());
  assert(nestedJsonFile.good());

  coordinator.Shutdown();
  return 0;
}
