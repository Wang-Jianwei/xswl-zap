#pragma once

#include <cstdint>

namespace vna {
namespace core {

enum class ExcitationMode {
  kContinuousWave = 0,
  kPulse = 1,
  kModulated = 2,
};

struct CwExcitation {
  double frequencyHz = 0.0;
  double powerDbm = 0.0;
  std::uint32_t dwellTimeMs = 0;
};

struct PulseExcitation {
  double centerFrequencyHz = 0.0;
  std::uint32_t pulseWidthNs = 0;
  std::uint32_t pulsePeriodNs = 0;
  double powerDbm = 0.0;
  std::uint32_t riseTimeNs = 0;
};

struct ExcitationConfig {
  ExcitationMode mode = ExcitationMode::kContinuousWave;
  CwExcitation cw;
  PulseExcitation pulse;
  std::uint32_t settlingTimeMs = 0;
  bool enableAutoTrigger = false;
};

}  // namespace core
}  // namespace vna
