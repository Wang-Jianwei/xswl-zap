#include <cassert>
#include <memory>

#include "core/built_in_drivers.h"
#include "core/hardware_coordinator.h"
#include "core/hardware_driver_factory.h"
#include "core/measurement_pipeline.h"

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
    excitation.cw.ifBandwidthHz = 1.0e3;
    excitation.cw.portCount = 4;
    excitation.cw.excitationPort = 2;

  vna::core::AcquisitionResult result;
  const vna::core::Status status = pipeline.Acquire("inst0", excitation, 128, 1000, result);
  assert(status == vna::core::Status::kOk);
  assert(result.instanceId == "inst0");
  assert(result.dataType == vna::core::AcquisitionDataType::kFrequencyDomain);
    assert(result.frequencyDomain.frequenciesHz.size() == 3);
    assert(result.frequencyDomain.samples.size() == 3);
    assert(result.receiverRaw.points.size() == 3);
    assert(result.receiverCompensated.points.size() == 3);
    assert(result.sParameters.points.size() == 3);
    assert(result.receiverRaw.points[0].channels.size() == 5);
    assert(result.receiverCompensated.points[0].channels.size() == 5);
    assert(result.sParameters.points[0].portCount == 4);
    assert(result.sParameters.points[0].matrix.size() == 16);
    assert(result.receiverRaw.points[0].channels[0].channelId == "R2");
    assert(result.receiverRaw.points[0].channels[1].channelId == "B1");
    assert(result.receiverRaw.points[0].channels[2].channelId == "B2");
    assert(result.receiverCompensated.points[0].channels[0].iq !=
      result.receiverRaw.points[0].channels[0].iq);
  assert(result.timestampNs != 0);

  coordinator.Shutdown();
  return 0;
}
