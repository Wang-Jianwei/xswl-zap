#include "core/acquisition_comparator.h"

#include <cmath>
#include <complex>
#include <sstream>

namespace vna {
namespace core {

namespace {

bool AlmostEqual(double lhs, double rhs, double tolerance) {
  return std::fabs(lhs - rhs) <= tolerance;
}

bool CompareComplex(const std::complex<double>& lhs,
                    const std::complex<double>& rhs,
                    double tolerance) {
  return AlmostEqual(lhs.real(), rhs.real(), tolerance) &&
         AlmostEqual(lhs.imag(), rhs.imag(), tolerance);
}

bool Fail(std::string* diffMessage, const std::string& message) {
  if (diffMessage != nullptr) {
    *diffMessage = message;
  }
  return false;
}

}  // namespace

bool AcquisitionComparator::AreEquivalentForReplay(const AcquisitionResult& baseline,
                                                   const AcquisitionResult& current,
                                                   double tolerance,
                                                   std::string* diffMessage) {
  if (tolerance <= 0.0) {
    return Fail(diffMessage, "invalid tolerance");
  }

  if (baseline.instanceId != current.instanceId) {
    return Fail(diffMessage, "instanceId mismatch");
  }

  if (baseline.receiverRaw.points.size() != current.receiverRaw.points.size()) {
    return Fail(diffMessage, "receiverRaw point count mismatch");
  }

  for (std::size_t pointIndex = 0; pointIndex < baseline.receiverRaw.points.size(); ++pointIndex) {
    const ReceiverFrequencyPoint& lhsPoint = baseline.receiverRaw.points[pointIndex];
    const ReceiverFrequencyPoint& rhsPoint = current.receiverRaw.points[pointIndex];

    if (!AlmostEqual(lhsPoint.frequencyHz, rhsPoint.frequencyHz, tolerance)) {
      return Fail(diffMessage, "receiverRaw frequency mismatch");
    }

    if (lhsPoint.channels.size() != rhsPoint.channels.size()) {
      return Fail(diffMessage, "receiverRaw channel count mismatch");
    }

    for (std::size_t channelIndex = 0; channelIndex < lhsPoint.channels.size(); ++channelIndex) {
      const ReceiverChannelSample& lhsChannel = lhsPoint.channels[channelIndex];
      const ReceiverChannelSample& rhsChannel = rhsPoint.channels[channelIndex];

      if (lhsChannel.channelId != rhsChannel.channelId) {
        return Fail(diffMessage, "receiverRaw channelId mismatch");
      }
      if (lhsChannel.clipped != rhsChannel.clipped) {
        return Fail(diffMessage, "receiverRaw clipped mismatch");
      }
      if (!CompareComplex(lhsChannel.iq, rhsChannel.iq, tolerance)) {
        return Fail(diffMessage, "receiverRaw iq mismatch");
      }
    }
  }

  if (baseline.receiverCompensated.points.size() != current.receiverCompensated.points.size()) {
    return Fail(diffMessage, "receiverCompensated point count mismatch");
  }

  for (std::size_t pointIndex = 0; pointIndex < baseline.receiverCompensated.points.size(); ++pointIndex) {
    const ReceiverFrequencyPoint& lhsPoint = baseline.receiverCompensated.points[pointIndex];
    const ReceiverFrequencyPoint& rhsPoint = current.receiverCompensated.points[pointIndex];

    if (!AlmostEqual(lhsPoint.frequencyHz, rhsPoint.frequencyHz, tolerance)) {
      return Fail(diffMessage, "receiverCompensated frequency mismatch");
    }

    if (lhsPoint.channels.size() != rhsPoint.channels.size()) {
      return Fail(diffMessage, "receiverCompensated channel count mismatch");
    }

    for (std::size_t channelIndex = 0; channelIndex < lhsPoint.channels.size(); ++channelIndex) {
      const ReceiverChannelSample& lhsChannel = lhsPoint.channels[channelIndex];
      const ReceiverChannelSample& rhsChannel = rhsPoint.channels[channelIndex];

      if (lhsChannel.channelId != rhsChannel.channelId) {
        return Fail(diffMessage, "receiverCompensated channelId mismatch");
      }
      if (lhsChannel.clipped != rhsChannel.clipped) {
        return Fail(diffMessage, "receiverCompensated clipped mismatch");
      }
      if (!CompareComplex(lhsChannel.iq, rhsChannel.iq, tolerance)) {
        return Fail(diffMessage, "receiverCompensated iq mismatch");
      }
    }
  }

  if (baseline.sParameters.points.size() != current.sParameters.points.size()) {
    return Fail(diffMessage, "sParameter point count mismatch");
  }

  for (std::size_t pointIndex = 0; pointIndex < baseline.sParameters.points.size(); ++pointIndex) {
    const SParameterFrequencyPoint& lhsPoint = baseline.sParameters.points[pointIndex];
    const SParameterFrequencyPoint& rhsPoint = current.sParameters.points[pointIndex];

    if (!AlmostEqual(lhsPoint.frequencyHz, rhsPoint.frequencyHz, tolerance)) {
      return Fail(diffMessage, "sParameter frequency mismatch");
    }

    if (lhsPoint.portCount != rhsPoint.portCount) {
      return Fail(diffMessage, "sParameter portCount mismatch");
    }

    if (lhsPoint.matrix.size() != rhsPoint.matrix.size()) {
      return Fail(diffMessage, "sParameter matrix size mismatch");
    }

    for (std::size_t valueIndex = 0; valueIndex < lhsPoint.matrix.size(); ++valueIndex) {
      if (!CompareComplex(lhsPoint.matrix[valueIndex], rhsPoint.matrix[valueIndex], tolerance)) {
        return Fail(diffMessage, "sParameter matrix value mismatch");
      }
    }
  }

  if (diffMessage != nullptr) {
    diffMessage->clear();
  }
  return true;
}

}  // namespace core
}  // namespace vna
