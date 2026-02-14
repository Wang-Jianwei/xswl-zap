#pragma once

#include <complex>
#include <vector>

#include "core/measurement_data.h"
#include "core/status.h"

namespace vna {
namespace core {
namespace processors {

class DeEmbeddingProcessor {
 public:
  // MVP: diagonal fixture compensation.
  // corrected(i,j) = measured(i,j) / (portTransfer[i] * portTransfer[j]).
  Status ApplyDiagonalFixtureCompensation(
      SParameterData& sParameters,
      const std::vector<std::complex<double> >& portTransfer) const;
};

}  // namespace processors
}  // namespace core
}  // namespace vna
