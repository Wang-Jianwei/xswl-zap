#include "core/processors/time_domain_processor.h"

#include <cmath>

namespace vna {
namespace core {
namespace processors {

std::vector<double> TimeDomainProcessor::TimeToDistance(const std::vector<double>& timePointsNs,
                                                        double velocityFactor) const {
  std::vector<double> distanceMm;
  distanceMm.reserve(timePointsNs.size());

  const double lightSpeedMmPerNs = 299.792458;
  const double propagationMmPerNs = lightSpeedMmPerNs * velocityFactor;

  for (std::size_t index = 0; index < timePointsNs.size(); ++index) {
    distanceMm.push_back((timePointsNs[index] * propagationMmPerNs) / 2.0);
  }
  return distanceMm;
}

bool TimeDomainProcessor::ComputeImpedanceProfile(const TimeDomainData& timeDomainData,
                                                  double characteristicImpedance,
                                                  std::vector<double>& impedanceOhm) const {
  if (timeDomainData.magnitude.empty() || characteristicImpedance <= 0.0) {
    return false;
  }

  impedanceOhm.clear();
  impedanceOhm.reserve(timeDomainData.magnitude.size());

  for (std::size_t index = 0; index < timeDomainData.magnitude.size(); ++index) {
    const double gamma = timeDomainData.magnitude[index];
    const double denominator = 1.0 - gamma;
    if (std::fabs(denominator) < 1e-9) {
      impedanceOhm.push_back(characteristicImpedance * 1e6);
      continue;
    }
    impedanceOhm.push_back(characteristicImpedance * ((1.0 + gamma) / denominator));
  }

  return true;
}

std::vector<TimeDomainProcessor::ReflectionPoint> TimeDomainProcessor::DetectReflections(
    const std::vector<double>& impedanceOhm,
    double thresholdMagnitude) const {
  std::vector<ReflectionPoint> points;

  if (impedanceOhm.size() < 3) {
    return points;
  }

  std::uint32_t reflectionCounter = 0;
  for (std::size_t index = 1; index + 1 < impedanceOhm.size(); ++index) {
    const double prev = impedanceOhm[index - 1];
    const double curr = impedanceOhm[index];
    const double next = impedanceOhm[index + 1];

    const bool localPeak = (curr > prev && curr > next) || (curr < prev && curr < next);
    if (!localPeak) {
      continue;
    }

    const double delta = std::fabs(curr - prev) + std::fabs(curr - next);
    if (delta < thresholdMagnitude) {
      continue;
    }

    ReflectionPoint point;
    point.distanceMm = static_cast<double>(index);
    point.magnitude = delta;
    point.reflectionIndex = reflectionCounter++;
    points.push_back(point);
  }

  return points;
}

}  // namespace processors
}  // namespace core
}  // namespace vna
