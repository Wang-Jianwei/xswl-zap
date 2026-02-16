import { strict as assert } from "node:assert";
import { buildLockSnapshotSummary, collectConflictSelectors } from "../src/lockDiagnostics";

(() => {
  const selectors = collectConflictSelectors([
    {
      selector: { type: "1", resourceId: "dev0" },
      holderLeaseId: "",
      holderOwner: { workspaceId: "ws-a", instanceId: "", sessionId: "", actor: "actor-a" },
      holderFencingToken: 0,
      holderExpireAtMs: 0,
      suggestion: "",
    },
    {
      selector: { type: "1", resourceId: "dev0" },
      holderLeaseId: "",
      holderOwner: { workspaceId: "ws-b", instanceId: "", sessionId: "", actor: "actor-b" },
      holderFencingToken: 0,
      holderExpireAtMs: 0,
      suggestion: "",
    },
    {
      selector: { type: "1", resourceId: "dev1" },
      holderLeaseId: "",
      holderOwner: { workspaceId: "ws-c", instanceId: "", sessionId: "", actor: "actor-c" },
      holderFencingToken: 0,
      holderExpireAtMs: 0,
      suggestion: "",
    },
  ]);

  assert.equal(selectors.length, 2);
  assert.equal(selectors[0]?.resourceId, "dev0");
  assert.equal(selectors[1]?.resourceId, "dev1");

  const unavailableSummary = buildLockSnapshotSummary(null, 2);
  assert.equal(unavailableSummary, "Lock snapshot unavailable on current server.");

  const emptySummary = buildLockSnapshotSummary({ leases: [] }, 1);
  assert.equal(emptySummary, "Lock snapshot: no active leases on conflicted resources.");

  const leaseSummary = buildLockSnapshotSummary(
    {
      leases: [
        {
          leaseId: "lease-1",
          selector: { type: "1", resourceId: "dev0" },
          owner: { workspaceId: "ws-a", instanceId: "", sessionId: "", actor: "editor-a" },
          mode: "LOCK_MODE_EXCLUSIVE",
          fencingToken: 11,
          acquiredAtMs: 1,
          expireAtMs: 2,
        },
        {
          leaseId: "lease-2",
          selector: { type: "1", resourceId: "dev1" },
          owner: { workspaceId: "ws-b", instanceId: "", sessionId: "", actor: "editor-b" },
          mode: "LOCK_MODE_EXCLUSIVE",
          fencingToken: 12,
          acquiredAtMs: 1,
          expireAtMs: 2,
        },
      ],
    },
    2,
    1,
  );

  assert(leaseSummary.includes("resource=dev0, holder=ws-a/editor-a"));
  assert(leaseSummary.includes("+1 more leases"));

  process.stdout.write("lockDiagnostics.test passed\n");
})();
