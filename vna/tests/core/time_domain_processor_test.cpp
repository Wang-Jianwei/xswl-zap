#include <cassert>
#include <vector>

#include "core/processors/time_domain_processor.h"

int main() {
  vna::core::processors::TimeDomainProcessor processor;

  std::vector<double> timePointsNs;
  timePointsNs.push_back(1.0);
  timePointsNs.push_back(2.0);

  const std::vector<double> distanceMm = processor.TimeToDistance(timePointsNs, 0.5);
  assert(distanceMm.size() == 2);
  assert(distanceMm[1] > distanceMm[0]);

  vna::core::TimeDomainData data;
  data.magnitude.push_back(0.1);
  data.magnitude.push_back(0.2);
  data.magnitude.push_back(0.5);
  data.magnitude.push_back(0.1);

  std::vector<double> impedance;
  const bool ok = processor.ComputeImpedanceProfile(data, 50.0, impedance);
  assert(ok);
  assert(impedance.size() == data.magnitude.size());

  const std::vector<vna::core::processors::TimeDomainProcessor::ReflectionPoint> reflections =
      processor.DetectReflections(impedance, 0.5);
  (void)reflections;

  return 0;
}
