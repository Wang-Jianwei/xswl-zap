#include <cassert>
#include <vector>

#include "core/trigger_chain_validator.h"

int main() {
  vna::core::TriggerChainValidator validator;

  std::vector<vna::core::TriggerTimingEntry> entries;
  vna::core::TriggerTimingEntry first;
  first.boardId = "board0";
  first.triggerLatencyNs = 100.0;
  first.jitterNs = 3.0;
  entries.push_back(first);

  vna::core::TriggerTimingEntry second;
  second.boardId = "board1";
  second.triggerLatencyNs = 130.0;
  second.jitterNs = 4.0;
  entries.push_back(second);

  const vna::core::TriggerTimingAnalysis analysis = validator.Analyze(entries, 50.0);
  assert(analysis.meetsSpec);
  assert(analysis.maxSkewNs == 30.0);

  return 0;
}
