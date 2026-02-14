#pragma once

#include <complex>
#include <vector>

#include "core/measurement_data.h"
#include "core/status.h"

namespace vna {
namespace core {
namespace processors {

struct FrequencyPortTransferProfile {
    double frequencyHz = 0.0;
    std::vector<std::complex<double> > portTransfer;
};

class DeEmbeddingProcessor {
 public:
  // MVP: diagonal fixture compensation.
  // corrected(i,j) = measured(i,j) / (portTransfer[i] * portTransfer[j]).
  Status ApplyDiagonalFixtureCompensation(
      SParameterData& sParameters,
      const std::vector<std::complex<double> >& portTransfer) const;

    // Frequency-aware diagonal compensation.
    // For each S-parameter point, choose nearest frequency profile.
    Status ApplyFrequencyDependentDiagonalFixtureCompensation(
            SParameterData& sParameters,
            const std::vector<FrequencyPortTransferProfile>& profiles) const;
};

}  // namespace processors
}  // namespace core
}  // namespace vna
