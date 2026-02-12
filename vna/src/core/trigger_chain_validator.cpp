#include "core/trigger_chain_validator.h"

#include <algorithm>

namespace vna {
namespace core {

TriggerTimingAnalysis TriggerChainValidator::Analyze(
    const std::vector<TriggerTimingEntry>& entries,
    double skewSpecNs) const {
  TriggerTimingAnalysis analysis;
  analysis.entries = entries;

  if (entries.empty()) {
    analysis.maxSkewNs = 0.0;
    analysis.meetsSpec = true;
    return analysis;
  }

  double minLatency = entries.front().triggerLatencyNs;
  double maxLatency = entries.front().triggerLatencyNs;

  for (std::size_t index = 1; index < entries.size(); ++index) {
    minLatency = std::min(minLatency, entries[index].triggerLatencyNs);
    maxLatency = std::max(maxLatency, entries[index].triggerLatencyNs);
  }

  analysis.maxSkewNs = maxLatency - minLatency;
  analysis.meetsSpec = analysis.maxSkewNs <= skewSpecNs;
  return analysis;
}

}  // namespace core
}  // namespace vna
