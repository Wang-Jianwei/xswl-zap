#pragma once

#include <cstdint>
#include <string>

#include "core/excitation_mode.h"
#include "core/hardware_coordinator.h"
#include "core/measurement_data.h"
#include "core/status.h"

namespace vna {
namespace core {

class MeasurementPipeline {
 public:
  explicit MeasurementPipeline(HardwareCoordinator* coordinator);

  Status Acquire(const std::string& instanceId,
                 const ExcitationConfig& excitation,
                 std::uint32_t sampleCount,
                 std::uint32_t timeoutMs,
                 AcquisitionResult& out);

 private:
  HardwareCoordinator* coordinator_;
};

}  // namespace core
}  // namespace vna
