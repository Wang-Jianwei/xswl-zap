#pragma once

#include <complex>
#include <cstdint>
#include <string>
#include <vector>

namespace vna {
namespace core {

enum class DriverStatus {
  kOk = 0,
  kTimeout = 1,
  kUnsupported = 2,
  kInvalidArgument = 3,
  kInternalError = 4,
};

enum class TriggerMode {
  kInternal = 0,
  kExternal = 1,
  kManual = 2,
};

enum class TriggerEdge {
  kRising = 0,
  kFalling = 1,
};

struct PulseConfig {
  std::uint32_t pulseWidthNs = 0;
  std::uint32_t pulsePeriodNs = 0;
  std::uint32_t riseTimeNs = 0;
  double centerFrequencyHz = 0.0;
  double powerDbm = 0.0;
};

struct HardwareCapabilities {
  bool supportsPulseExcitation = false;
  bool supportsMultiTone = false;
  bool supportsExternalClock = false;
  std::uint32_t minPulseWidthNs = 0;
  std::uint32_t minPulsePeriodNs = 0;
  double maxSamplingRateGhz = 0.0;
};

class HardwareDriver {
 public:
  virtual ~HardwareDriver() {}

  virtual DriverStatus Initialize() = 0;
  virtual DriverStatus Shutdown() = 0;

  virtual std::string GetModel() const = 0;
  virtual std::string GetSerialNumber() const = 0;
  virtual HardwareCapabilities GetCapabilities() const = 0;

  virtual DriverStatus SetFrequency(double frequencyHz) = 0;
  virtual DriverStatus SetPower(double powerDbm) = 0;

  virtual DriverStatus SetPulseMode(const PulseConfig& config) {
    (void)config;
    return DriverStatus::kUnsupported;
  }

  virtual DriverStatus AcquireIq(std::vector<std::complex<double>>& samples,
                                 std::uint32_t sampleCount) = 0;

  virtual DriverStatus SetTriggerMode(TriggerMode mode) = 0;
  virtual DriverStatus SetExternalTriggerEdge(TriggerEdge edge) = 0;
  virtual DriverStatus WaitForTrigger(std::uint32_t timeoutMs) = 0;

  virtual DriverStatus HealthCheck() = 0;
};

}  // namespace core
}  // namespace vna
