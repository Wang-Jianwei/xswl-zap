import { strict as assert } from "node:assert";
import { buildCwExcitationFromSampleCount, parseInstanceCapabilities } from "../src/serviceClient";

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

  const capabilities = parseInstanceCapabilities({
    supportsPulseExcitation: true,
    supportsMultiTone: false,
    supportsExternalClock: true,
    minPulseWidthNs: 120,
    minPulsePeriodNs: 600,
    maxSamplingRateGhz: 5.2,
  });
  assert.equal(capabilities.supportsPulseExcitation, true);
  assert.equal(capabilities.supportsMultiTone, false);
  assert.equal(capabilities.supportsExternalClock, true);
  assert.equal(capabilities.minPulseWidthNs, 120);
  assert.equal(capabilities.minPulsePeriodNs, 600);
  assert.equal(capabilities.maxSamplingRateGhz, 5.2);

  process.stdout.write("serviceClient.test passed\n");
})();
