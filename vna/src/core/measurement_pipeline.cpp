#include "core/measurement_pipeline.h"

namespace vna {
namespace core {

MeasurementPipeline::MeasurementPipeline(HardwareCoordinator* coordinator)
    : coordinator_(coordinator) {}

Status MeasurementPipeline::Acquire(const std::string& instanceId,
                                    const ExcitationConfig& excitation,
                                    std::uint32_t sampleCount,
                                    std::uint32_t timeoutMs,
                                    AcquisitionResult& out) {
  if (!coordinator_) {
    return Status::kInvalidArgument;
  }
  return coordinator_->Acquire(instanceId, excitation, sampleCount, timeoutMs, out);
}

}  // namespace core
}  // namespace vna
