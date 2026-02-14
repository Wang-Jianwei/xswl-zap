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
  std::size_t receiverRawTotalPoints = 0;
  std::size_t receiverCompTotalPoints = 0;
  std::size_t sParameterTotalPoints = 0;
  double receiverRawMaxFrequencyHz = 0.0;
  double receiverCompMaxFrequencyHz = 0.0;
  double sParameterMaxFrequencyHz = 0.0;
  bool receiverRawMaxIsReal = true;
  bool receiverCompMaxIsReal = true;
  bool sParameterMaxIsReal = true;
  double receiverRawMaxSignedDelta = 0.0;
  double receiverCompMaxSignedDelta = 0.0;
  double sParameterMaxSignedDelta = 0.0;
  double receiverRawMaxComponentMargin = 0.0;
  double receiverCompMaxComponentMargin = 0.0;
  double sParameterMaxComponentMargin = 0.0;
  std::complex<double> receiverRawMaxExpected;
  std::complex<double> receiverRawMaxActual;
  std::complex<double> receiverCompMaxExpected;
  std::complex<double> receiverCompMaxActual;
  std::complex<double> sParameterMaxExpected;
  std::complex<double> sParameterMaxActual;

  enum class Category {
    kReceiverRaw,
    kReceiverCompensated,
    kSParameter,
  };

  void Observe(const std::complex<double>& expected,
               const std::complex<double>& actual,
               Category category,
               std::size_t pointIndex,
               std::size_t subIndex,
               double frequencyHz) {
    const double realSignedDelta = actual.real() - expected.real();
    const double imagSignedDelta = actual.imag() - expected.imag();
    const double realDelta = std::fabs(realSignedDelta);
    const double imagDelta = std::fabs(imagSignedDelta);
    const bool dominantIsReal = realDelta >= imagDelta;
    const double componentDelta = dominantIsReal ? realDelta : imagDelta;
    const double dominantSignedDelta = dominantIsReal ? realSignedDelta : imagSignedDelta;
    const double componentMargin = std::fabs(realDelta - imagDelta);

    sampleCount += 1;
    if (category == Category::kReceiverRaw) {
      receiverRawSamples += 1;
      receiverRawSumSquareDelta += componentDelta * componentDelta;
      if (!hasReceiverRawMax || componentDelta > receiverRawMaxDelta) {
        hasReceiverRawMax = true;
        receiverRawMaxDelta = componentDelta;
        receiverRawMaxPoint = pointIndex;
        receiverRawMaxChannel = subIndex;
        receiverRawMaxFrequencyHz = frequencyHz;
        receiverRawMaxIsReal = dominantIsReal;
        receiverRawMaxSignedDelta = dominantSignedDelta;
        receiverRawMaxComponentMargin = componentMargin;
        receiverRawMaxExpected = expected;
        receiverRawMaxActual = actual;
      }
    } else if (category == Category::kReceiverCompensated) {
      receiverCompSamples += 1;
      receiverCompSumSquareDelta += componentDelta * componentDelta;
      if (!hasReceiverCompMax || componentDelta > receiverCompMaxDelta) {
        hasReceiverCompMax = true;
        receiverCompMaxDelta = componentDelta;
        receiverCompMaxPoint = pointIndex;
        receiverCompMaxChannel = subIndex;
        receiverCompMaxFrequencyHz = frequencyHz;
        receiverCompMaxIsReal = dominantIsReal;
        receiverCompMaxSignedDelta = dominantSignedDelta;
        receiverCompMaxComponentMargin = componentMargin;
        receiverCompMaxExpected = expected;
        receiverCompMaxActual = actual;
      }
    } else {
      sParameterSamples += 1;
      sParameterSumSquareDelta += componentDelta * componentDelta;
      if (!hasSParameterMax || componentDelta > sParameterMaxDelta) {
        hasSParameterMax = true;
        sParameterMaxDelta = componentDelta;
        sParameterMaxPoint = pointIndex;
        sParameterMaxValue = subIndex;
        sParameterMaxFrequencyHz = frequencyHz;
        sParameterMaxIsReal = dominantIsReal;
        sParameterMaxSignedDelta = dominantSignedDelta;
        sParameterMaxComponentMargin = componentMargin;
        sParameterMaxExpected = expected;
        sParameterMaxActual = actual;
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
    const double overallMaxDeltaRatio = tolerance == 0.0 ? 0.0 : (maxComponentDelta / tolerance);
    const double overallRmsDeltaRatio = tolerance == 0.0 ? 0.0 : (rmsDelta / tolerance);
    const double receiverRawMaxDeltaRatio =
      tolerance == 0.0 ? 0.0 : (receiverRawMaxDelta / tolerance);
    const double receiverCompMaxDeltaRatio =
      tolerance == 0.0 ? 0.0 : (receiverCompMaxDelta / tolerance);
    const double sParameterMaxDeltaRatio =
      tolerance == 0.0 ? 0.0 : (sParameterMaxDelta / tolerance);
    const double receiverRawRmsDeltaRatio =
      tolerance == 0.0 ? 0.0 : (receiverRawRmsDelta / tolerance);
    const double receiverCompRmsDeltaRatio =
      tolerance == 0.0 ? 0.0 : (receiverCompRmsDelta / tolerance);
    const double sParameterRmsDeltaRatio =
      tolerance == 0.0 ? 0.0 : (sParameterRmsDelta / tolerance);
    const double receiverRawMaxPointRatio = receiverRawTotalPoints <= 1
      ? 0.0
      : static_cast<double>(receiverRawMaxPoint) /
        static_cast<double>(receiverRawTotalPoints - 1);
    const double receiverCompMaxPointRatio = receiverCompTotalPoints <= 1
      ? 0.0
      : static_cast<double>(receiverCompMaxPoint) /
        static_cast<double>(receiverCompTotalPoints - 1);
    const double sParameterMaxPointRatio = sParameterTotalPoints <= 1
      ? 0.0
      : static_cast<double>(sParameterMaxPoint) /
        static_cast<double>(sParameterTotalPoints - 1);

    bool hasWorst = false;
    const char* worstCategory = "none";
    const char* worstComponent = "real";
    const char* worstLocationLabel = "channel";
    std::size_t worstPoint = 0;
    std::size_t worstSubIndex = 0;
    std::size_t worstTotalPoints = 0;
    double worstFrequencyHz = 0.0;
    double worstDelta = 0.0;
    double worstSignedDelta = 0.0;
    double worstComponentMargin = 0.0;
    std::complex<double> worstExpected;
    std::complex<double> worstActual;

    if (hasReceiverRawMax) {
      hasWorst = true;
      worstCategory = "receiver_raw";
      worstComponent = receiverRawMaxIsReal ? "real" : "imag";
      worstLocationLabel = "channel";
      worstPoint = receiverRawMaxPoint;
      worstSubIndex = receiverRawMaxChannel;
      worstFrequencyHz = receiverRawMaxFrequencyHz;
      worstDelta = receiverRawMaxDelta;
      worstSignedDelta = receiverRawMaxSignedDelta;
      worstComponentMargin = receiverRawMaxComponentMargin;
      worstTotalPoints = receiverRawTotalPoints;
      worstExpected = receiverRawMaxExpected;
      worstActual = receiverRawMaxActual;
    }
    if (hasReceiverCompMax && (!hasWorst || receiverCompMaxDelta > worstDelta)) {
      hasWorst = true;
      worstCategory = "receiver_comp";
      worstComponent = receiverCompMaxIsReal ? "real" : "imag";
      worstLocationLabel = "channel";
      worstPoint = receiverCompMaxPoint;
      worstSubIndex = receiverCompMaxChannel;
      worstFrequencyHz = receiverCompMaxFrequencyHz;
      worstDelta = receiverCompMaxDelta;
      worstSignedDelta = receiverCompMaxSignedDelta;
      worstComponentMargin = receiverCompMaxComponentMargin;
      worstTotalPoints = receiverCompTotalPoints;
      worstExpected = receiverCompMaxExpected;
      worstActual = receiverCompMaxActual;
    }
    if (hasSParameterMax && (!hasWorst || sParameterMaxDelta > worstDelta)) {
      hasWorst = true;
      worstCategory = "sparameter";
      worstComponent = sParameterMaxIsReal ? "real" : "imag";
      worstLocationLabel = "value";
      worstPoint = sParameterMaxPoint;
      worstSubIndex = sParameterMaxValue;
      worstFrequencyHz = sParameterMaxFrequencyHz;
      worstDelta = sParameterMaxDelta;
      worstSignedDelta = sParameterMaxSignedDelta;
      worstComponentMargin = sParameterMaxComponentMargin;
      worstTotalPoints = sParameterTotalPoints;
      worstExpected = sParameterMaxExpected;
      worstActual = sParameterMaxActual;
    }
    const double worstDeltaRatio = tolerance == 0.0 ? 0.0 : (worstDelta / tolerance);
    const double worstPointRatio = worstTotalPoints <= 1
      ? 0.0
      : static_cast<double>(worstPoint) / static_cast<double>(worstTotalPoints - 1);

        stream << "tolerance=" << tolerance
          << ", samples=" << sampleCount
          << ", receiver_raw_samples=" << receiverRawSamples
          << ", receiver_comp_samples=" << receiverCompSamples
          << ", sparameter_samples=" << sParameterSamples
           << ", max_component_delta=" << maxComponentDelta
              << ", rms_component_delta=" << rmsDelta
              << ", max_component_delta_ratio=" << overallMaxDeltaRatio
              << ", rms_component_delta_ratio=" << overallRmsDeltaRatio
              << ", receiver_raw_rms_delta=" << receiverRawRmsDelta
              << ", receiver_raw_rms_delta_ratio=" << receiverRawRmsDeltaRatio
              << ", receiver_comp_rms_delta=" << receiverCompRmsDelta
              << ", receiver_comp_rms_delta_ratio=" << receiverCompRmsDeltaRatio
              << ", sparameter_rms_delta=" << sParameterRmsDelta
              << ", sparameter_rms_delta_ratio=" << sParameterRmsDeltaRatio;

            if (hasWorst) {
              const double worstRealDelta = std::fabs(worstActual.real() - worstExpected.real());
              const double worstImagDelta = std::fabs(worstActual.imag() - worstExpected.imag());
              stream << ", worst_category=" << worstCategory
                << ", worst_max_delta=" << worstDelta
                << ", worst_max_delta_ratio=" << worstDeltaRatio
                << ", worst_max_component=" << worstComponent
                << ", worst_max_component_margin=" << worstComponentMargin
                << ", worst_max_signed_delta=" << worstSignedDelta
                << ", worst_max_frequency_hz=" << worstFrequencyHz
                << ", worst_total_points=" << worstTotalPoints
                << ", worst_max_point_ratio=" << worstPointRatio
                << ", worst_max_real_delta=" << worstRealDelta
                << ", worst_max_imag_delta=" << worstImagDelta
                << ", worst_expected_real=" << worstExpected.real()
                << ", worst_expected_imag=" << worstExpected.imag()
                << ", worst_actual_real=" << worstActual.real()
                << ", worst_actual_imag=" << worstActual.imag()
                << ", worst_max_at=point:" << worstPoint
                << "/" << worstLocationLabel << ":" << worstSubIndex;
            }

            if (hasReceiverRawMax) {
              const double receiverRawMaxRealDelta =
                std::fabs(receiverRawMaxActual.real() - receiverRawMaxExpected.real());
              const double receiverRawMaxImagDelta =
                std::fabs(receiverRawMaxActual.imag() - receiverRawMaxExpected.imag());
              stream << ", receiver_raw_max_delta=" << receiverRawMaxDelta
                << ", receiver_raw_max_at=point:" << receiverRawMaxPoint
                << "/channel:" << receiverRawMaxChannel
                << ", receiver_raw_max_frequency_hz=" << receiverRawMaxFrequencyHz
                << ", receiver_raw_total_points=" << receiverRawTotalPoints
                << ", receiver_raw_max_point_ratio=" << receiverRawMaxPointRatio
                << ", receiver_raw_max_delta_ratio=" << receiverRawMaxDeltaRatio
                << ", receiver_raw_max_component=" << (receiverRawMaxIsReal ? "real" : "imag")
                << ", receiver_raw_max_component_margin=" << receiverRawMaxComponentMargin
                << ", receiver_raw_max_signed_delta=" << receiverRawMaxSignedDelta
                << ", receiver_raw_max_real_delta=" << receiverRawMaxRealDelta
                << ", receiver_raw_max_imag_delta=" << receiverRawMaxImagDelta
                << ", receiver_raw_max_expected_real=" << receiverRawMaxExpected.real()
                << ", receiver_raw_max_expected_imag=" << receiverRawMaxExpected.imag()
                << ", receiver_raw_max_actual_real=" << receiverRawMaxActual.real()
                << ", receiver_raw_max_actual_imag=" << receiverRawMaxActual.imag();
            }
            if (hasReceiverCompMax) {
              const double receiverCompMaxRealDelta =
                std::fabs(receiverCompMaxActual.real() - receiverCompMaxExpected.real());
              const double receiverCompMaxImagDelta =
                std::fabs(receiverCompMaxActual.imag() - receiverCompMaxExpected.imag());
              stream << ", receiver_comp_max_delta=" << receiverCompMaxDelta
                << ", receiver_comp_max_at=point:" << receiverCompMaxPoint
                << "/channel:" << receiverCompMaxChannel
                << ", receiver_comp_max_frequency_hz=" << receiverCompMaxFrequencyHz
                << ", receiver_comp_total_points=" << receiverCompTotalPoints
                << ", receiver_comp_max_point_ratio=" << receiverCompMaxPointRatio
                << ", receiver_comp_max_delta_ratio=" << receiverCompMaxDeltaRatio
                << ", receiver_comp_max_component=" << (receiverCompMaxIsReal ? "real" : "imag")
                << ", receiver_comp_max_component_margin=" << receiverCompMaxComponentMargin
                << ", receiver_comp_max_signed_delta=" << receiverCompMaxSignedDelta
                << ", receiver_comp_max_real_delta=" << receiverCompMaxRealDelta
                << ", receiver_comp_max_imag_delta=" << receiverCompMaxImagDelta
                << ", receiver_comp_max_expected_real=" << receiverCompMaxExpected.real()
                << ", receiver_comp_max_expected_imag=" << receiverCompMaxExpected.imag()
                << ", receiver_comp_max_actual_real=" << receiverCompMaxActual.real()
                << ", receiver_comp_max_actual_imag=" << receiverCompMaxActual.imag();
            }
            if (hasSParameterMax) {
              const double sParameterMaxRealDelta =
                std::fabs(sParameterMaxActual.real() - sParameterMaxExpected.real());
              const double sParameterMaxImagDelta =
                std::fabs(sParameterMaxActual.imag() - sParameterMaxExpected.imag());
              stream << ", sparameter_max_delta=" << sParameterMaxDelta
                << ", sparameter_max_at=point:" << sParameterMaxPoint
                << "/value:" << sParameterMaxValue
                << ", sparameter_max_frequency_hz=" << sParameterMaxFrequencyHz
                << ", sparameter_total_points=" << sParameterTotalPoints
                << ", sparameter_max_point_ratio=" << sParameterMaxPointRatio
                << ", sparameter_max_delta_ratio=" << sParameterMaxDeltaRatio
                << ", sparameter_max_component=" << (sParameterMaxIsReal ? "real" : "imag")
                << ", sparameter_max_component_margin=" << sParameterMaxComponentMargin
                << ", sparameter_max_signed_delta=" << sParameterMaxSignedDelta
                << ", sparameter_max_real_delta=" << sParameterMaxRealDelta
                << ", sparameter_max_imag_delta=" << sParameterMaxImagDelta
                << ", sparameter_max_expected_real=" << sParameterMaxExpected.real()
                << ", sparameter_max_expected_imag=" << sParameterMaxExpected.imag()
                << ", sparameter_max_actual_real=" << sParameterMaxActual.real()
                << ", sparameter_max_actual_imag=" << sParameterMaxActual.imag();
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
  stats.receiverRawTotalPoints = baseline.receiverRaw.points.size();

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
                    channelIndex,
                    lhsPoint.frequencyHz);
    }
  }

  if (baseline.receiverCompensated.points.size() != current.receiverCompensated.points.size()) {
    std::ostringstream message;
    message << "receiverCompensated point count mismatch: expected="
            << baseline.receiverCompensated.points.size()
            << ", actual=" << current.receiverCompensated.points.size();
    return Fail(diffMessage, message.str());
  }
  stats.receiverCompTotalPoints = baseline.receiverCompensated.points.size();

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
                    channelIndex,
                    lhsPoint.frequencyHz);
    }
  }

  if (baseline.sParameters.points.size() != current.sParameters.points.size()) {
    std::ostringstream message;
    message << "sParameter point count mismatch: expected=" << baseline.sParameters.points.size()
            << ", actual=" << current.sParameters.points.size();
    return Fail(diffMessage, message.str());
  }
  stats.sParameterTotalPoints = baseline.sParameters.points.size();

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
                    valueIndex,
                    lhsPoint.frequencyHz);
    }
  }

  if (diffMessage != nullptr) {
    *diffMessage = "COMPARE_MATCHED: " + stats.BuildSummary();
  }
  return true;
}

}  // namespace core
}  // namespace vna
