import { strict as assert } from "node:assert";
import {
  formatAcquisitionSummary,
  formatInstanceCapabilities,
  formatServiceStatusMultiline,
  formatServiceStatus,
  formatStreamPreviewSummary,
  formatValidationResult,
} from "../src/statusFormatter";

(() => {
  const text = formatServiceStatus({
    ready: true,
    state: "ready",
    message: "ok",
    bootstrapMode: "",
    configPath: "",
    uptimeMs: 1234,
    bindAddress: "127.0.0.1",
    port: 50051,
    tlsEnabled: false,
    logLevel: "info",
    instanceCount: 2,
    activeLeaseCount: 1,
  });

  assert.equal(
    text,
    "state=ready | ready=true | message=ok | uptimeMs=1234 | bind=127.0.0.1:50051 | tls=false | log=info | instances=2 | leases=1",
  );

  assert.equal(
    formatServiceStatus({
      ready: true,
      state: "ready",
      message: "grpc bootstrap | config=config/service.yaml",
      bootstrapMode: "",
      configPath: "",
      uptimeMs: 88,
      bindAddress: "127.0.0.1",
      port: 50051,
      tlsEnabled: false,
      logLevel: "info",
      instanceCount: 1,
      activeLeaseCount: 0,
    }),
    "state=ready | ready=true | message=grpc bootstrap | uptimeMs=88 | bind=127.0.0.1:50051 | tls=false | log=info | instances=1 | leases=0 | configPath=config/service.yaml",
  );

  assert.equal(
    formatServiceStatus({
      ready: true,
      state: "ready",
      message: "grpc bootstrap",
      bootstrapMode: "grpc",
      configPath: "config/service.yaml",
      uptimeMs: 99,
      bindAddress: "127.0.0.1",
      port: 50051,
      tlsEnabled: false,
      logLevel: "info",
      instanceCount: 1,
      activeLeaseCount: 0,
    }),
    "state=ready | ready=true | message=grpc bootstrap | uptimeMs=99 | bind=127.0.0.1:50051 | tls=false | log=info | instances=1 | leases=0 | configPath=config/service.yaml | bootstrapMode=grpc",
  );

  assert.equal(
    formatServiceStatus({
      ready: true,
      state: "ready",
      message: "grpc bootstrap | config=legacy/path.yaml",
      bootstrapMode: "grpc",
      configPath: "structured/path.yaml",
      uptimeMs: 100,
      bindAddress: "127.0.0.1",
      port: 50051,
      tlsEnabled: false,
      logLevel: "info",
      instanceCount: 1,
      activeLeaseCount: 0,
    }),
    "state=ready | ready=true | message=grpc bootstrap | uptimeMs=100 | bind=127.0.0.1:50051 | tls=false | log=info | instances=1 | leases=0 | configPath=structured/path.yaml | bootstrapMode=grpc",
  );

  assert.equal(
    formatServiceStatusMultiline({
      ready: true,
      state: "ready",
      message: "grpc bootstrap | config=config/service.yaml",
      bootstrapMode: "",
      configPath: "",
      uptimeMs: 88,
      bindAddress: "127.0.0.1",
      port: 50051,
      tlsEnabled: false,
      logLevel: "info",
      instanceCount: 1,
      activeLeaseCount: 0,
    }),
    "state=ready\nready=true\nmessage=grpc bootstrap\nuptimeMs=88\nbind=127.0.0.1:50051\ntls=false\nlog=info\ninstances=1\nleases=0\nconfigPath=config/service.yaml",
  );

  assert.equal(
    formatValidationResult({
      ok: true,
      errors: [],
      errorDetails: [],
    }),
    "ok=true | errors=0",
  );

  assert.equal(
    formatValidationResult({
      ok: false,
      errors: ["missing node"],
      errorDetails: [
        { code: "E_TOPOLOGY", field: "nodes", message: "missing node" },
      ],
    }),
    "ok=false | errors=1 | first=missing node",
  );

  assert.equal(
    formatAcquisitionSummary({
      instanceId: "inst0",
      timestampNs: 123456,
      frameType: "frequency",
      pointCount: 128,
    }),
    "instanceId=inst0 | timestampNs=123456 | frame=frequency | points=128",
  );

  assert.equal(
    formatStreamPreviewSummary({
      frameCount: 18,
      latestTimestampNs: 9988,
      lastFrameType: "time",
      lastPointCount: 64,
      canceled: true,
    }),
    "frames=18 | latestTimestampNs=9988 | lastFrame=time | lastPoints=64 | canceled=true",
  );

  assert.equal(
    formatInstanceCapabilities({
      supportsPulseExcitation: true,
      supportsMultiTone: false,
      supportsExternalClock: true,
      minPulseWidthNs: 80,
      minPulsePeriodNs: 200,
      maxSamplingRateGhz: 2.5,
    }),
    "pulse=true | multiTone=false | externalClock=true | minPulseWidthNs=80 | minPulsePeriodNs=200 | maxSamplingRateGhz=2.5",
  );

  process.stdout.write("statusFormatter.test passed\n");
})();
