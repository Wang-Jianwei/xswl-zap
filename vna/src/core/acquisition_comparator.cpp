#include "core/acquisition_comparator.h"

#include <cmath>
#include <complex>
#include <iomanip>
#include <limits>
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

bool IsFiniteComplex(const std::complex<double>& value) {
  return std::isfinite(value.real()) && std::isfinite(value.imag());
}

bool Fail(std::string* diffMessage, const std::string& message) {
  if (diffMessage != nullptr) {
    *diffMessage = message;
  }
  return false;
}

struct ComparisonStats {
  std::size_t sampleCount = 0;
  std::size_t receiverRawSamples = 0;
  std::size_t receiverCompSamples = 0;
  std::size_t sParameterSamples = 0;
  double maxComponentDelta = 0.0;
  double sumSquareDelta = 0.0;
  double tolerance = 0.0;
  bool hasReceiverRawMax = false;
  bool hasReceiverCompMax = false;
  bool hasSParameterMax = false;
  double receiverRawMaxDelta = 0.0;
  double receiverCompMaxDelta = 0.0;
  double sParameterMaxDelta = 0.0;
  double receiverRawSumSquareDelta = 0.0;
  double receiverCompSumSquareDelta = 0.0;
  double sParameterSumSquareDelta = 0.0;
  std::size_t receiverRawMaxPoint = 0;
  std::size_t receiverRawMaxChannel = 0;
  std::size_t receiverCompMaxPoint = 0;
  std::size_t receiverCompMaxChannel = 0;
  std::size_t sParameterMaxPoint = 0;
  std::size_t sParameterMaxValue = 0;
  bool receiverRawMaxIsReal = true;
  bool receiverCompMaxIsReal = true;
  bool sParameterMaxIsReal = true;
  double receiverRawMaxSignedDelta = 0.0;
  double receiverCompMaxSignedDelta = 0.0;
  double sParameterMaxSignedDelta = 0.0;

  enum class Category {
    kReceiverRaw,
    kReceiverCompensated,
    kSParameter,
  };

  void Observe(const std::complex<double>& expected,
               const std::complex<double>& actual,
               Category category,
               std::size_t pointIndex,
               std::size_t subIndex) {
    const double realSignedDelta = actual.real() - expected.real();
    const double imagSignedDelta = actual.imag() - expected.imag();
    const double realDelta = std::fabs(realSignedDelta);
    const double imagDelta = std::fabs(imagSignedDelta);
    const bool dominantIsReal = realDelta >= imagDelta;
    const double componentDelta = dominantIsReal ? realDelta : imagDelta;
    const double dominantSignedDelta = dominantIsReal ? realSignedDelta : imagSignedDelta;

    sampleCount += 1;
    if (category == Category::kReceiverRaw) {
      receiverRawSamples += 1;
      receiverRawSumSquareDelta += componentDelta * componentDelta;
      if (!hasReceiverRawMax || componentDelta > receiverRawMaxDelta) {
        hasReceiverRawMax = true;
        receiverRawMaxDelta = componentDelta;
        receiverRawMaxPoint = pointIndex;
        receiverRawMaxChannel = subIndex;
        receiverRawMaxIsReal = dominantIsReal;
        receiverRawMaxSignedDelta = dominantSignedDelta;
      }
    } else if (category == Category::kReceiverCompensated) {
      receiverCompSamples += 1;
      receiverCompSumSquareDelta += componentDelta * componentDelta;
      if (!hasReceiverCompMax || componentDelta > receiverCompMaxDelta) {
        hasReceiverCompMax = true;
        receiverCompMaxDelta = componentDelta;
        receiverCompMaxPoint = pointIndex;
        receiverCompMaxChannel = subIndex;
        receiverCompMaxIsReal = dominantIsReal;
        receiverCompMaxSignedDelta = dominantSignedDelta;
      }
    } else {
      sParameterSamples += 1;
      sParameterSumSquareDelta += componentDelta * componentDelta;
      if (!hasSParameterMax || componentDelta > sParameterMaxDelta) {
        hasSParameterMax = true;
        sParameterMaxDelta = componentDelta;
        sParameterMaxPoint = pointIndex;
        sParameterMaxValue = subIndex;
        sParameterMaxIsReal = dominantIsReal;
        sParameterMaxSignedDelta = dominantSignedDelta;
      }
    }
    maxComponentDelta = std::max(maxComponentDelta, componentDelta);
    sumSquareDelta += componentDelta * componentDelta;
  }

  std::string BuildSummary() const {
    std::ostringstream stream;
    stream << std::setprecision(6) << std::scientific;
    const double rmsDelta = sampleCount == 0
                                ? 0.0
                                : std::sqrt(sumSquareDelta / static_cast<double>(sampleCount));
    const double receiverRawRmsDelta = receiverRawSamples == 0
                                           ? 0.0
                                           : std::sqrt(receiverRawSumSquareDelta /
                                                       static_cast<double>(receiverRawSamples));
    const double receiverCompRmsDelta = receiverCompSamples == 0
                                            ? 0.0
                                            : std::sqrt(receiverCompSumSquareDelta /
                                                        static_cast<double>(receiverCompSamples));
    const double sParameterRmsDelta = sParameterSamples == 0
                                          ? 0.0
                                          : std::sqrt(sParameterSumSquareDelta /
                                                      static_cast<double>(sParameterSamples));
        stream << "tolerance=" << tolerance
          << ", samples=" << sampleCount
          << ", receiver_raw_samples=" << receiverRawSamples
          << ", receiver_comp_samples=" << receiverCompSamples
          << ", sparameter_samples=" << sParameterSamples
           << ", max_component_delta=" << maxComponentDelta
              << ", rms_component_delta=" << rmsDelta
              << ", receiver_raw_rms_delta=" << receiverRawRmsDelta
              << ", receiver_comp_rms_delta=" << receiverCompRmsDelta
              << ", sparameter_rms_delta=" << sParameterRmsDelta;

            if (hasReceiverRawMax) {
              stream << ", receiver_raw_max_delta=" << receiverRawMaxDelta
                << ", receiver_raw_max_at=point:" << receiverRawMaxPoint
                << "/channel:" << receiverRawMaxChannel
                << ", receiver_raw_max_component=" << (receiverRawMaxIsReal ? "real" : "imag")
                << ", receiver_raw_max_signed_delta=" << receiverRawMaxSignedDelta;
            }
            if (hasReceiverCompMax) {
              stream << ", receiver_comp_max_delta=" << receiverCompMaxDelta
                << ", receiver_comp_max_at=point:" << receiverCompMaxPoint
                << "/channel:" << receiverCompMaxChannel
                << ", receiver_comp_max_component=" << (receiverCompMaxIsReal ? "real" : "imag")
                << ", receiver_comp_max_signed_delta=" << receiverCompMaxSignedDelta;
            }
            if (hasSParameterMax) {
              stream << ", sparameter_max_delta=" << sParameterMaxDelta
                << ", sparameter_max_at=point:" << sParameterMaxPoint
                << "/value:" << sParameterMaxValue
                << ", sparameter_max_component=" << (sParameterMaxIsReal ? "real" : "imag")
                << ", sparameter_max_signed_delta=" << sParameterMaxSignedDelta;
            }
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
  stats.tolerance = tolerance;
  if (tolerance <= 0.0) {
    return Fail(diffMessage, "invalid tolerance");
  }

  if (baseline.instanceId != current.instanceId) {
    std::ostringstream message;
    message << "instanceId mismatch: expected='" << baseline.instanceId
            << "', actual='" << current.instanceId << "'";
    return Fail(diffMessage, message.str());
  }

  if (baseline.receiverRaw.points.size() != current.receiverRaw.points.size()) {
    std::ostringstream message;
    message << "receiverRaw point count mismatch: expected=" << baseline.receiverRaw.points.size()
            << ", actual=" << current.receiverRaw.points.size();
    return Fail(diffMessage, message.str());
  }

  for (std::size_t pointIndex = 0; pointIndex < baseline.receiverRaw.points.size(); ++pointIndex) {
    const ReceiverFrequencyPoint& lhsPoint = baseline.receiverRaw.points[pointIndex];
    const ReceiverFrequencyPoint& rhsPoint = current.receiverRaw.points[pointIndex];

    if (!AlmostEqual(lhsPoint.frequencyHz, rhsPoint.frequencyHz, tolerance)) {
      std::ostringstream message;
      message << "receiverRaw frequency mismatch at point=" << pointIndex
              << ": expected=" << std::setprecision(6) << std::scientific << lhsPoint.frequencyHz
              << ", actual=" << rhsPoint.frequencyHz
              << ", tolerance=" << tolerance;
      return FailWithStats(diffMessage, message.str(), stats);
    }

    if (lhsPoint.channels.size() != rhsPoint.channels.size()) {
      std::ostringstream message;
      message << "receiverRaw channel count mismatch at point=" << pointIndex
              << ": expected=" << lhsPoint.channels.size()
              << ", actual=" << rhsPoint.channels.size();
      return FailWithStats(diffMessage, message.str(), stats);
    }

    for (std::size_t channelIndex = 0; channelIndex < lhsPoint.channels.size(); ++channelIndex) {
      const ReceiverChannelSample& lhsChannel = lhsPoint.channels[channelIndex];
      const ReceiverChannelSample& rhsChannel = rhsPoint.channels[channelIndex];

      if (lhsChannel.channelId != rhsChannel.channelId) {
        std::ostringstream message;
        message << "receiverRaw channelId mismatch at point=" << pointIndex
                << ", channel=" << channelIndex
                << ": expected='" << lhsChannel.channelId
                << "', actual='" << rhsChannel.channelId << "'";
        return FailWithStats(diffMessage, message.str(), stats);
      }
      if (lhsChannel.clipped != rhsChannel.clipped) {
        std::ostringstream message;
        message << "receiverRaw clipped mismatch at point=" << pointIndex
                << ", channel=" << channelIndex
                << ": expected=" << (lhsChannel.clipped ? "true" : "false")
                << ", actual=" << (rhsChannel.clipped ? "true" : "false");
        return FailWithStats(diffMessage, message.str(), stats);
      }
      if (!IsFiniteComplex(lhsChannel.iq) || !IsFiniteComplex(rhsChannel.iq)) {
        std::ostringstream message;
        message << "receiverRaw iq non-finite at point=" << pointIndex
                << ", channel=" << channelIndex;
        return FailWithStats(diffMessage, message.str(), stats);
      }
      double delta = 0.0;
      if (!CompareComplex(lhsChannel.iq, rhsChannel.iq, tolerance, &delta)) {
        std::ostringstream message;
        message << "receiverRaw iq mismatch at point=" << pointIndex
                << ", channel=" << channelIndex
                << ", delta=" << std::setprecision(6) << std::scientific << delta;
        return FailWithStats(diffMessage, message.str(), stats);
      }
      stats.Observe(lhsChannel.iq,
            rhsChannel.iq,
            ComparisonStats::Category::kReceiverRaw,
            pointIndex,
            channelIndex);
    }
  }

  if (baseline.receiverCompensated.points.size() != current.receiverCompensated.points.size()) {
    std::ostringstream message;
    message << "receiverCompensated point count mismatch: expected="
            << baseline.receiverCompensated.points.size()
            << ", actual=" << current.receiverCompensated.points.size();
    return Fail(diffMessage, message.str());
  }

  for (std::size_t pointIndex = 0; pointIndex < baseline.receiverCompensated.points.size(); ++pointIndex) {
    const ReceiverFrequencyPoint& lhsPoint = baseline.receiverCompensated.points[pointIndex];
    const ReceiverFrequencyPoint& rhsPoint = current.receiverCompensated.points[pointIndex];

    if (!AlmostEqual(lhsPoint.frequencyHz, rhsPoint.frequencyHz, tolerance)) {
      std::ostringstream message;
      message << "receiverCompensated frequency mismatch at point=" << pointIndex
              << ": expected=" << std::setprecision(6) << std::scientific << lhsPoint.frequencyHz
              << ", actual=" << rhsPoint.frequencyHz
              << ", tolerance=" << tolerance;
      return FailWithStats(diffMessage, message.str(), stats);
    }

    if (lhsPoint.channels.size() != rhsPoint.channels.size()) {
      std::ostringstream message;
      message << "receiverCompensated channel count mismatch at point=" << pointIndex
              << ": expected=" << lhsPoint.channels.size()
              << ", actual=" << rhsPoint.channels.size();
      return FailWithStats(diffMessage, message.str(), stats);
    }

    for (std::size_t channelIndex = 0; channelIndex < lhsPoint.channels.size(); ++channelIndex) {
      const ReceiverChannelSample& lhsChannel = lhsPoint.channels[channelIndex];
      const ReceiverChannelSample& rhsChannel = rhsPoint.channels[channelIndex];

      if (lhsChannel.channelId != rhsChannel.channelId) {
        std::ostringstream message;
        message << "receiverCompensated channelId mismatch at point=" << pointIndex
                << ", channel=" << channelIndex
                << ": expected='" << lhsChannel.channelId
                << "', actual='" << rhsChannel.channelId << "'";
        return FailWithStats(diffMessage, message.str(), stats);
      }
      if (lhsChannel.clipped != rhsChannel.clipped) {
        std::ostringstream message;
        message << "receiverCompensated clipped mismatch at point=" << pointIndex
                << ", channel=" << channelIndex
                << ": expected=" << (lhsChannel.clipped ? "true" : "false")
                << ", actual=" << (rhsChannel.clipped ? "true" : "false");
        return FailWithStats(diffMessage, message.str(), stats);
      }
      if (!IsFiniteComplex(lhsChannel.iq) || !IsFiniteComplex(rhsChannel.iq)) {
        std::ostringstream message;
        message << "receiverCompensated iq non-finite at point=" << pointIndex
                << ", channel=" << channelIndex;
        return FailWithStats(diffMessage, message.str(), stats);
      }
      double delta = 0.0;
      if (!CompareComplex(lhsChannel.iq, rhsChannel.iq, tolerance, &delta)) {
        std::ostringstream message;
        message << "receiverCompensated iq mismatch at point=" << pointIndex
                << ", channel=" << channelIndex
                << ", delta=" << std::setprecision(6) << std::scientific << delta;
        return FailWithStats(diffMessage, message.str(), stats);
      }
      stats.Observe(lhsChannel.iq,
            rhsChannel.iq,
            ComparisonStats::Category::kReceiverCompensated,
            pointIndex,
            channelIndex);
    }
  }

  if (baseline.sParameters.points.size() != current.sParameters.points.size()) {
    std::ostringstream message;
    message << "sParameter point count mismatch: expected=" << baseline.sParameters.points.size()
            << ", actual=" << current.sParameters.points.size();
    return Fail(diffMessage, message.str());
  }

  for (std::size_t pointIndex = 0; pointIndex < baseline.sParameters.points.size(); ++pointIndex) {
    const SParameterFrequencyPoint& lhsPoint = baseline.sParameters.points[pointIndex];
    const SParameterFrequencyPoint& rhsPoint = current.sParameters.points[pointIndex];

    if (!AlmostEqual(lhsPoint.frequencyHz, rhsPoint.frequencyHz, tolerance)) {
      std::ostringstream message;
      message << "sParameter frequency mismatch at point=" << pointIndex
              << ": expected=" << std::setprecision(6) << std::scientific << lhsPoint.frequencyHz
              << ", actual=" << rhsPoint.frequencyHz
              << ", tolerance=" << tolerance;
      return FailWithStats(diffMessage, message.str(), stats);
    }

    if (lhsPoint.portCount != rhsPoint.portCount) {
      std::ostringstream message;
      message << "sParameter portCount mismatch at point=" << pointIndex
              << ": expected=" << lhsPoint.portCount
              << ", actual=" << rhsPoint.portCount;
      return FailWithStats(diffMessage, message.str(), stats);
    }

    if (lhsPoint.matrix.size() != rhsPoint.matrix.size()) {
      std::ostringstream message;
      message << "sParameter matrix size mismatch at point=" << pointIndex
              << ": expected=" << lhsPoint.matrix.size()
              << ", actual=" << rhsPoint.matrix.size();
      return FailWithStats(diffMessage, message.str(), stats);
    }

    for (std::size_t valueIndex = 0; valueIndex < lhsPoint.matrix.size(); ++valueIndex) {
      if (!IsFiniteComplex(lhsPoint.matrix[valueIndex]) || !IsFiniteComplex(rhsPoint.matrix[valueIndex])) {
        std::ostringstream message;
        message << "sParameter matrix non-finite at point=" << pointIndex
                << ", value=" << valueIndex;
        return FailWithStats(diffMessage, message.str(), stats);
      }
      double delta = 0.0;
      if (!CompareComplex(lhsPoint.matrix[valueIndex], rhsPoint.matrix[valueIndex], tolerance, &delta)) {
        std::ostringstream message;
        message << "sParameter matrix value mismatch at point=" << pointIndex
                << ", value=" << valueIndex
                << ", delta=" << std::setprecision(6) << std::scientific << delta;
        return FailWithStats(diffMessage, message.str(), stats);
      }
      stats.Observe(lhsPoint.matrix[valueIndex],
            rhsPoint.matrix[valueIndex],
            ComparisonStats::Category::kSParameter,
            pointIndex,
            valueIndex);
    }
  }

  if (diffMessage != nullptr) {
    *diffMessage = "COMPARE_MATCHED: " + stats.BuildSummary();
  }
  return true;
}

}  // namespace core
}  // namespace vna
