import { strict as assert } from "node:assert";
import { buildCwExcitationFromSampleCount } from "../src/serviceClient";

(() => {
  const config = buildCwExcitationFromSampleCount(256) as Record<string, number>;
  assert.equal(config.sweepPointCount, 256);
  assert.equal(config.startFrequencyHz, 0.95e9);
  assert.equal(config.stopFrequencyHz, 1.05e9);
  assert.equal(config.frequencyHz, 1.0e9);

  const small = buildCwExcitationFromSampleCount(1) as Record<string, number>;
  assert.equal(small.sweepPointCount, 2);

  const huge = buildCwExcitationFromSampleCount(100000) as Record<string, number>;
  assert.equal(huge.sweepPointCount, 4096);

  process.stdout.write("serviceClient.test passed\n");
})();
