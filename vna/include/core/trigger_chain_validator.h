#pragma once

#include <string>
#include <vector>

namespace vna {
namespace core {

struct TriggerTimingEntry {
  std::string boardId;
  double triggerLatencyNs = 0.0;
  double jitterNs = 0.0;
};

struct TriggerTimingAnalysis {
  std::vector<TriggerTimingEntry> entries;
  double maxSkewNs = 0.0;
  bool meetsSpec = false;
};

class TriggerChainValidator {
 public:
  TriggerTimingAnalysis Analyze(const std::vector<TriggerTimingEntry>& entries,
                                double skewSpecNs) const;
};

}  // namespace core
}  // namespace vna
