#include <cassert>
#include <thread>

#include "core/built_in_drivers.h"
#include "core/excitation_mode.h"
#include "core/measurement_data.h"
#include "service/vna_control_service.h"

int main() {
  vna::core::RegisterBuiltInDrivers();

  vna::service::VnaControlService service;

  vna::core::Topology topology;
  topology.id = "multi-it";
  topology.yaml =
      "instances:\n"
      "  - id: inst0\n"
      "    driver: pxi\n"
      "    device: pxi-mock-0\n"
      "    resource: dev0\n"
      "  - id: inst1\n"
      "    driver: usb\n"
      "    device: usb-mock-0\n"
      "    resource: dev1\n";

  assert(service.ApplyTopology(topology, "ws-multi", 2) == vna::core::Status::kOk);
  assert(service.Start() == vna::core::Status::kOk);

  vna::core::ExcitationConfig excitation;
  excitation.mode = vna::core::ExcitationMode::kContinuousWave;
  excitation.cw.startFrequencyHz = 1.0e9;
  excitation.cw.stopFrequencyHz = 1.1e9;
  excitation.cw.sweepPointCount = 3;
  excitation.cw.frequencyHz = 1.0e9;
  excitation.cw.powerDbm = -10.0;
  excitation.cw.portCount = 2;
  excitation.cw.excitationPort = 1;

  vna::core::Status inst0Status = vna::core::Status::kInternalError;
  vna::core::Status inst1Status = vna::core::Status::kInternalError;
  vna::core::AcquisitionResult inst0Result;
  vna::core::AcquisitionResult inst1Result;

  std::thread t0([&]() {
    inst0Status = service.AcquireOnce("inst0", excitation, 64, 1000, inst0Result);
  });
  std::thread t1([&]() {
    inst1Status = service.AcquireOnce("inst1", excitation, 64, 1000, inst1Result);
  });

  t0.join();
  t1.join();

  assert(inst0Status == vna::core::Status::kOk);
  assert(inst1Status == vna::core::Status::kOk);
  assert(inst0Result.instanceId == "inst0");
  assert(inst1Result.instanceId == "inst1");
  assert(inst0Result.sParameters.points.size() == 3);
  assert(inst1Result.sParameters.points.size() == 3);

  assert(service.Stop() == vna::core::Status::kOk);
  return 0;
}
