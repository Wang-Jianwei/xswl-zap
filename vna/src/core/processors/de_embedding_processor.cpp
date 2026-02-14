#include "core/processors/de_embedding_processor.h"

#include <cstddef>
#include <cmath>

namespace {

bool IsValidPortTransfer(const std::vector<std::complex<double> >& portTransfer,
                         std::size_t portCount) {
  if (portTransfer.size() != portCount) {
    return false;
  }

  for (std::size_t transferIndex = 0; transferIndex < portTransfer.size(); ++transferIndex) {
    const double magnitude = std::abs(portTransfer[transferIndex]);
    if (magnitude <= 1e-15) {
      return false;
    }
  }

  return true;
}

bool BuildInterpolatedPortTransfer(
    double frequencyHz,
    std::size_t portCount,
    const std::vector<vna::core::processors::FrequencyPortTransferProfile>& profiles,
    std::vector<std::complex<double> >& outTransfer) {
  if (profiles.empty()) {
    return false;
  }

  std::size_t lowerIndex = 0;
  std::size_t upperIndex = profiles.size() - 1;

  for (std::size_t i = 0; i < profiles.size(); ++i) {
    if (profiles[i].frequencyHz <= frequencyHz) {
      lowerIndex = i;
    }
    if (profiles[i].frequencyHz >= frequencyHz) {
      upperIndex = i;
      break;
    }
  }

  const vna::core::processors::FrequencyPortTransferProfile& lower = profiles[lowerIndex];
  const vna::core::processors::FrequencyPortTransferProfile& upper = profiles[upperIndex];

  if (!IsValidPortTransfer(lower.portTransfer, portCount) ||
      !IsValidPortTransfer(upper.portTransfer, portCount)) {
    return false;
  }

  outTransfer.clear();
  outTransfer.reserve(portCount);

  const bool samePoint = std::fabs(upper.frequencyHz - lower.frequencyHz) <= 1e-15;
  const double alpha = samePoint ? 0.0 :
      (frequencyHz - lower.frequencyHz) / (upper.frequencyHz - lower.frequencyHz);

  for (std::size_t i = 0; i < portCount; ++i) {
    const std::complex<double> interpolated =
        lower.portTransfer[i] + (upper.portTransfer[i] - lower.portTransfer[i]) * alpha;
    if (std::abs(interpolated) <= 1e-15) {
      return false;
    }
    outTransfer.push_back(interpolated);
  }

  return true;
}

}  // namespace

namespace vna {
namespace core {
namespace processors {

Status DeEmbeddingProcessor::ApplyDiagonalFixtureCompensation(
    SParameterData& sParameters,
    const std::vector<std::complex<double> >& portTransfer) const {
  if (sParameters.points.empty()) {
    return Status::kInvalidArgument;
  }

  for (std::size_t pointIndex = 0; pointIndex < sParameters.points.size(); ++pointIndex) {
    SParameterFrequencyPoint& point = sParameters.points[pointIndex];
    const std::size_t portCount = static_cast<std::size_t>(point.portCount);
    if (portCount == 0) {
      return Status::kInvalidArgument;
    }

    const std::size_t expectedMatrixSize = portCount * portCount;
    if (point.matrix.size() != expectedMatrixSize) {
      return Status::kInvalidArgument;
    }

    if (!IsValidPortTransfer(portTransfer, portCount)) {
      return Status::kInvalidArgument;
    }

    for (std::size_t row = 0; row < portCount; ++row) {
      for (std::size_t col = 0; col < portCount; ++col) {
        const std::size_t matrixIndex = row * portCount + col;
        point.matrix[matrixIndex] = point.matrix[matrixIndex] /
            (portTransfer[row] * portTransfer[col]);
      }
    }
  }

  return Status::kOk;
}

Status DeEmbeddingProcessor::ApplyFrequencyDependentDiagonalFixtureCompensation(
    SParameterData& sParameters,
    const std::vector<FrequencyPortTransferProfile>& profiles) const {
  if (sParameters.points.empty() || profiles.empty()) {
    return Status::kInvalidArgument;
  }

  for (std::size_t pointIndex = 0; pointIndex < sParameters.points.size(); ++pointIndex) {
    SParameterFrequencyPoint& point = sParameters.points[pointIndex];
    const std::size_t portCount = static_cast<std::size_t>(point.portCount);
    if (portCount == 0) {
      return Status::kInvalidArgument;
    }

    const std::size_t expectedMatrixSize = portCount * portCount;
    if (point.matrix.size() != expectedMatrixSize) {
      return Status::kInvalidArgument;
    }

    std::vector<std::complex<double> > interpolatedTransfer;
    if (!BuildInterpolatedPortTransfer(point.frequencyHz, portCount, profiles, interpolatedTransfer)) {
      return Status::kInvalidArgument;
    }

    for (std::size_t row = 0; row < portCount; ++row) {
      for (std::size_t col = 0; col < portCount; ++col) {
        const std::size_t matrixIndex = row * portCount + col;
        point.matrix[matrixIndex] = point.matrix[matrixIndex] /
            (interpolatedTransfer[row] * interpolatedTransfer[col]);
      }
    }
  }

  return Status::kOk;
}

}  // namespace processors
}  // namespace core
}  // namespace vna
