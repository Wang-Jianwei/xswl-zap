#include "core/acquisition_comparator.h"

#include <cmath>
#include <complex>
#include <iomanip>
#include <sstream>

namespace vna {
namespace core {

namespace {

bool AlmostEqual(double lhs, double rhs, double tolerance) {
  return std::fabs(lhs - rhs) <= tolerance;
}

bool CompareComplex(const std::complex<double>& lhs,
                    const std::complex<double>& rhs,
                    double tolerance,
                    double* maxComponentDelta = nullptr) {
  const double realDelta = std::fabs(lhs.real() - rhs.real());
  const double imagDelta = std::fabs(lhs.imag() - rhs.imag());
  if (maxComponentDelta != nullptr) {
    *maxComponentDelta = std::max(realDelta, imagDelta);
  }
  return realDelta <= tolerance && imagDelta <= tolerance;
}

bool Fail(std::string* diffMessage, const std::string& message) {
  if (diffMessage != nullptr) {
    *diffMessage = message;
  }
  return false;
}

struct ComparisonStats {
  std::size_t sampleCount = 0;
  double maxComponentDelta = 0.0;
  double sumSquareDelta = 0.0;

  void Observe(double delta) {
    sampleCount += 1;
    maxComponentDelta = std::max(maxComponentDelta, delta);
    sumSquareDelta += delta * delta;
  }

  std::string BuildSummary() const {
    std::ostringstream stream;
    stream << std::setprecision(6) << std::scientific;
    const double rmsDelta = sampleCount == 0
                                ? 0.0
                                : std::sqrt(sumSquareDelta / static_cast<double>(sampleCount));
    stream << "samples=" << sampleCount
           << ", max_component_delta=" << maxComponentDelta
           << ", rms_component_delta=" << rmsDelta;
    return stream.str();
  }
};

bool FailWithStats(std::string* diffMessage,
                   const std::string& message,
                   const ComparisonStats& stats) {
  return Fail(diffMessage, message + " | " + stats.BuildSummary());
}

}  // namespace

bool AcquisitionComparator::AreEquivalentForReplay(const AcquisitionResult& baseline,
                                                   const AcquisitionResult& current,
                                                   double tolerance,
                                                   std::string* diffMessage) {
  ComparisonStats stats;
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
      double delta = 0.0;
      if (!CompareComplex(lhsChannel.iq, rhsChannel.iq, tolerance, &delta)) {
        std::ostringstream message;
        message << "receiverRaw iq mismatch at point=" << pointIndex
                << ", channel=" << channelIndex
                << ", delta=" << std::setprecision(6) << std::scientific << delta;
        return FailWithStats(diffMessage, message.str(), stats);
      }
      stats.Observe(delta);
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
      double delta = 0.0;
      if (!CompareComplex(lhsChannel.iq, rhsChannel.iq, tolerance, &delta)) {
        std::ostringstream message;
        message << "receiverCompensated iq mismatch at point=" << pointIndex
                << ", channel=" << channelIndex
                << ", delta=" << std::setprecision(6) << std::scientific << delta;
        return FailWithStats(diffMessage, message.str(), stats);
      }
      stats.Observe(delta);
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
      double delta = 0.0;
      if (!CompareComplex(lhsPoint.matrix[valueIndex], rhsPoint.matrix[valueIndex], tolerance, &delta)) {
        std::ostringstream message;
        message << "sParameter matrix value mismatch at point=" << pointIndex
                << ", value=" << valueIndex
                << ", delta=" << std::setprecision(6) << std::scientific << delta;
        return FailWithStats(diffMessage, message.str(), stats);
      }
      stats.Observe(delta);
    }
  }

  if (diffMessage != nullptr) {
    *diffMessage = "COMPARE_MATCHED: " + stats.BuildSummary();
  }
  return true;
}

}  // namespace core
}  // namespace vna
