#include "core/processors/de_embedding_processor.h"

#include <cstddef>

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

    if (portTransfer.size() != portCount) {
      return Status::kInvalidArgument;
    }

    const std::size_t expectedMatrixSize = portCount * portCount;
    if (point.matrix.size() != expectedMatrixSize) {
      return Status::kInvalidArgument;
    }

    for (std::size_t transferIndex = 0; transferIndex < portTransfer.size(); ++transferIndex) {
      const double magnitude = std::abs(portTransfer[transferIndex]);
      if (magnitude <= 1e-15) {
        return Status::kInvalidArgument;
      }
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

}  // namespace processors
}  // namespace core
}  // namespace vna
