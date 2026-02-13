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

struct ReceiverChannelSample {
  std::string channelId;
  std::complex<double> iq;
  bool clipped = false;
};

struct ReceiverFrequencyPoint {
  double frequencyHz = 0.0;
  std::uint64_t timestampNs = 0;
  std::vector<ReceiverChannelSample> channels;
};

struct ReceiverData {
  std::vector<ReceiverFrequencyPoint> points;
};

struct SParameterFrequencyPoint {
  double frequencyHz = 0.0;
  std::uint32_t portCount = 0;
  std::vector<std::complex<double>> matrix;
};

struct SParameterData {
  std::vector<SParameterFrequencyPoint> points;
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
  ReceiverData receiverRaw;
  ReceiverData receiverCompensated;
  SParameterData sParameters;

  std::uint64_t timestampNs = 0;
  std::string instanceId;
  double temperatureCelsius = 0.0;
};

}  // namespace core
}  // namespace vna
