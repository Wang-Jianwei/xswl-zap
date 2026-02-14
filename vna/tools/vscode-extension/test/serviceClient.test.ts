import { strict as assert } from "node:assert";
import {
  buildCwExcitationFromSampleCount,
  parseInstanceCapabilities,
  splitCompareDetail,
} from "../src/serviceClient";

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

  const withToken = splitCompareDetail(
    "COMPARE_MISMATCH: max_abs_diff=0.2, grpc_compare_token=instance:inst0|sample:128|timeout_ms:2000|tolerance:1e-6",
  );
  assert.equal(withToken.detail, "COMPARE_MISMATCH: max_abs_diff=0.2");
  assert.equal(withToken.grpcCompareToken, "grpc_compare_token=instance:inst0|sample:128|timeout_ms:2000|tolerance:1e-6");

  const tokenOnly = splitCompareDetail(
    "grpc_compare_token=instance:inst0|sample:128|timeout_ms:2000|tolerance:1e-6",
  );
  assert.equal(tokenOnly.detail, "");
  assert.equal(tokenOnly.grpcCompareToken, "grpc_compare_token=instance:inst0|sample:128|timeout_ms:2000|tolerance:1e-6");

  process.stdout.write("serviceClient.test passed\n");
})();
