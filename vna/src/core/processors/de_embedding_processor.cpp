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

std::size_t FindNearestProfileIndex(
    double frequencyHz,
    const std::vector<vna::core::processors::FrequencyPortTransferProfile>& profiles) {
  std::size_t bestIndex = 0;
  double bestDistance = std::fabs(profiles[0].frequencyHz - frequencyHz);
  for (std::size_t i = 1; i < profiles.size(); ++i) {
    const double distance = std::fabs(profiles[i].frequencyHz - frequencyHz);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }
  return bestIndex;
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

    const std::size_t profileIndex = FindNearestProfileIndex(point.frequencyHz, profiles);
    const std::vector<std::complex<double> >& selectedTransfer = profiles[profileIndex].portTransfer;
    if (!IsValidPortTransfer(selectedTransfer, portCount)) {
      return Status::kInvalidArgument;
    }

    for (std::size_t row = 0; row < portCount; ++row) {
      for (std::size_t col = 0; col < portCount; ++col) {
        const std::size_t matrixIndex = row * portCount + col;
        point.matrix[matrixIndex] = point.matrix[matrixIndex] /
            (selectedTransfer[row] * selectedTransfer[col]);
      }
    }
  }

  return Status::kOk;
}

}  // namespace processors
}  // namespace core
}  // namespace vna
