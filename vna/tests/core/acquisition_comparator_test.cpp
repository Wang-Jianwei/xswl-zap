#include <cassert>
#include <limits>

#include "core/acquisition_comparator.h"

namespace {

vna::core::AcquisitionResult BuildResult() {
  vna::core::AcquisitionResult result;
  result.instanceId = "inst0";
  result.timestampNs = 100;

  vna::core::ReceiverFrequencyPoint rawPoint;
  rawPoint.frequencyHz = 1.0e9;
  rawPoint.timestampNs = 100;
  vna::core::ReceiverChannelSample rawChannel;
  rawChannel.channelId = "R1";
  rawChannel.iq = std::complex<double>(1.0, 2.0);
  rawChannel.clipped = false;
  rawPoint.channels.push_back(rawChannel);
  result.receiverRaw.points.push_back(rawPoint);

  vna::core::ReceiverFrequencyPoint compPoint;
  compPoint.frequencyHz = 1.0e9;
  compPoint.timestampNs = 100;
  vna::core::ReceiverChannelSample compChannel;
  compChannel.channelId = "R1";
  compChannel.iq = std::complex<double>(0.8, 1.6);
  compChannel.clipped = false;
  compPoint.channels.push_back(compChannel);
  result.receiverCompensated.points.push_back(compPoint);

  vna::core::SParameterFrequencyPoint sPoint;
  sPoint.frequencyHz = 1.0e9;
  sPoint.portCount = 2;
  sPoint.matrix.push_back(std::complex<double>(0.1, 0.2));
  sPoint.matrix.push_back(std::complex<double>(0.3, 0.4));
  sPoint.matrix.push_back(std::complex<double>(0.5, 0.6));
  sPoint.matrix.push_back(std::complex<double>(0.7, 0.8));
  result.sParameters.points.push_back(sPoint);

  return result;
}

}  // namespace

int main() {
  const vna::core::AcquisitionResult baseline = BuildResult();
  vna::core::AcquisitionResult same = BuildResult();
  same.timestampNs += 12345;
  same.receiverRaw.points[0].timestampNs += 111;
  same.receiverCompensated.points[0].timestampNs += 222;

  std::string diff;
  assert(vna::core::AcquisitionComparator::AreEquivalentForReplay(baseline, same, 1e-9, &diff));
  assert(diff.find("COMPARE_MATCHED:") == 0);
  assert(diff.find("tolerance=") != std::string::npos);
  assert(diff.find("receiver_raw_samples=") != std::string::npos);
  assert(diff.find("receiver_comp_samples=") != std::string::npos);
  assert(diff.find("sparameter_samples=") != std::string::npos);
  assert(diff.find("max_component_delta=") != std::string::npos);
  assert(diff.find("rms_component_delta=") != std::string::npos);

  vna::core::AcquisitionResult mismatch = BuildResult();
  mismatch.sParameters.points[0].matrix[0] = std::complex<double>(9.9, 9.9);
  assert(!vna::core::AcquisitionComparator::AreEquivalentForReplay(baseline, mismatch, 1e-9, &diff));
  assert(diff.find("sParameter matrix value mismatch") != std::string::npos);
  assert(diff.find("delta=") != std::string::npos);

    vna::core::AcquisitionResult mismatchInstance = BuildResult();
    mismatchInstance.instanceId = "inst-x";
    assert(!vna::core::AcquisitionComparator::AreEquivalentForReplay(
      baseline, mismatchInstance, 1e-9, &diff));
    assert(diff.find("instanceId mismatch") != std::string::npos);
    assert(diff.find("expected='inst0'") != std::string::npos);
    assert(diff.find("actual='inst-x'") != std::string::npos);

    vna::core::AcquisitionResult mismatchCount = BuildResult();
    mismatchCount.receiverRaw.points.clear();
    assert(!vna::core::AcquisitionComparator::AreEquivalentForReplay(
      baseline, mismatchCount, 1e-9, &diff));
    assert(diff.find("receiverRaw point count mismatch") != std::string::npos);
    assert(diff.find("expected=1") != std::string::npos);
    assert(diff.find("actual=0") != std::string::npos);

  vna::core::AcquisitionResult nonFinite = BuildResult();
  nonFinite.receiverRaw.points[0].channels[0].iq =
      std::complex<double>(std::numeric_limits<double>::quiet_NaN(), 0.0);
  assert(!vna::core::AcquisitionComparator::AreEquivalentForReplay(baseline, nonFinite, 1e-9, &diff));
  assert(diff.find("non-finite") != std::string::npos);

  return 0;
}
