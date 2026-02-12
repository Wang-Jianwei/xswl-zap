#pragma once

#include <complex>
#include <cstdint>
#include <string>
#include <vector>

namespace vna {
namespace core {

enum class AcquisitionDataType {
  kFrequencyDomain = 0,
  kTimeDomain = 1,
};

struct FrequencyDomainData {
  std::vector<double> frequenciesHz;
  std::vector<std::complex<double>> samples;
};

struct TimeDomainData {
  std::vector<double> timePointsNs;
  std::vector<double> magnitude;
  std::vector<double> phase;
  double sampleRateGhz = 0.0;
};

struct AcquisitionResult {
  AcquisitionDataType dataType = AcquisitionDataType::kFrequencyDomain;
  FrequencyDomainData frequencyDomain;
  TimeDomainData timeDomain;

  std::uint64_t timestampNs = 0;
  std::string instanceId;
  double temperatureCelsius = 0.0;
};

}  // namespace core
}  // namespace vna
