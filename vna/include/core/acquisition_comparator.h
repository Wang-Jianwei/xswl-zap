#pragma once

#include <string>

#include "core/measurement_data.h"

namespace vna {
namespace core {

class AcquisitionComparator {
 public:
  static bool AreEquivalentForReplay(const AcquisitionResult& baseline,
                                     const AcquisitionResult& current,
                                     double tolerance,
                                     std::string* diffMessage = nullptr);
};

}  // namespace core
}  // namespace vna
