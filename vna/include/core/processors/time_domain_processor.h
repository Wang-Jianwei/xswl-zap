#pragma once

#include <cstdint>
#include <vector>

#include "core/measurement_data.h"

namespace vna {
namespace core {
namespace processors {

class TimeDomainProcessor {
 public:
  struct ReflectionPoint {
    double distanceMm = 0.0;
    double magnitude = 0.0;
    std::uint32_t reflectionIndex = 0;
  };

  std::vector<double> TimeToDistance(const std::vector<double>& timePointsNs,
                                     double velocityFactor) const;

  bool ComputeImpedanceProfile(const TimeDomainData& timeDomainData,
                               double characteristicImpedance,
                               std::vector<double>& impedanceOhm) const;

  std::vector<ReflectionPoint> DetectReflections(const std::vector<double>& impedanceOhm,
                                                 double thresholdMagnitude) const;
};

}  // namespace processors
}  // namespace core
}  // namespace vna
