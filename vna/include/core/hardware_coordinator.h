#pragma once

#include <cstdint>
#include <memory>
#include <string>

#include "core/excitation_mode.h"
#include "core/hardware_driver.h"
#include "core/measurement_data.h"
#include "core/status.h"

namespace vna {
namespace core {

class HardwareCoordinator {
 public:
  HardwareCoordinator();

  Status SetDriver(std::unique_ptr<HardwareDriver> driver);
  HardwareDriver* GetDriver() const;

  Status Initialize();
  Status Shutdown();

  // Minimal acquisition API for Phase 1.
  Status Acquire(const std::string& instanceId,
                 const ExcitationConfig& excitation,
                 std::uint32_t sampleCount,
                 std::uint32_t timeoutMs,
                 AcquisitionResult& out);

 private:
  Status AcquireCw(const std::string& instanceId,
                   const ExcitationConfig& excitation,
                   std::uint32_t sampleCount,
                   std::uint32_t timeoutMs,
                   AcquisitionResult& out);

  Status AcquirePulse(const std::string& instanceId,
                      const ExcitationConfig& excitation,
                      std::uint32_t sampleCount,
                      std::uint32_t timeoutMs,
                      AcquisitionResult& out);

  std::unique_ptr<HardwareDriver> driver_;
  bool initialized_;
};

}  // namespace core
}  // namespace vna
