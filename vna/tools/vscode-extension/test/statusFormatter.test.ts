import { strict as assert } from "node:assert";
import { formatServiceStatus } from "../src/statusFormatter";

(() => {
  const text = formatServiceStatus({
    ready: true,
    state: "ready",
    message: "ok",
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

  process.stdout.write("statusFormatter.test passed\n");
})();
