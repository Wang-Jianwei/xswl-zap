import { strict as assert } from "node:assert";
import {
  buildWorkspacePrecheckDiagnosticPayload,
  buildLockSnapshotSummary,
  buildWorkspacePrecheckDiagnosticSummary,
  collectConflictSelectors,
  groupLockConflicts,
  groupLockSnapshot,
} from "../src/lockDiagnostics";

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

  const conflictGroups = groupLockConflicts([
    {
      selector: { type: "1", resourceId: "dev-b" },
      holderLeaseId: "",
      holderOwner: { workspaceId: "ws-z", instanceId: "", sessionId: "", actor: "actor-1" },
      holderFencingToken: 0,
      holderExpireAtMs: 0,
      suggestion: "",
    },
    {
      selector: { type: "1", resourceId: "dev-a" },
      holderLeaseId: "",
      holderOwner: { workspaceId: "ws-a", instanceId: "", sessionId: "", actor: "actor-1" },
      holderFencingToken: 0,
      holderExpireAtMs: 0,
      suggestion: "",
    },
    {
      selector: { type: "1", resourceId: "dev-a" },
      holderLeaseId: "",
      holderOwner: { workspaceId: "ws-a", instanceId: "", sessionId: "", actor: "actor-1" },
      holderFencingToken: 0,
      holderExpireAtMs: 0,
      suggestion: "",
    },
  ]);

  assert.equal(conflictGroups[0]?.resourceId, "dev-a");
  assert.equal(conflictGroups[0]?.total, 2);
  assert.equal(conflictGroups[0]?.holders[0]?.holder, "ws-a/actor-1");
  assert.equal(conflictGroups[0]?.holders[0]?.count, 2);

  const snapshotGroups = groupLockSnapshot({
    leases: [
      {
        leaseId: "lease-1",
        selector: { type: "1", resourceId: "dev-a" },
        owner: { workspaceId: "ws-a", instanceId: "", sessionId: "", actor: "actor-1" },
        mode: "LOCK_MODE_EXCLUSIVE",
        fencingToken: 1,
        acquiredAtMs: 1,
        expireAtMs: 2,
      },
      {
        leaseId: "lease-2",
        selector: { type: "1", resourceId: "dev-a" },
        owner: { workspaceId: "ws-a", instanceId: "", sessionId: "", actor: "actor-1" },
        mode: "LOCK_MODE_EXCLUSIVE",
        fencingToken: 2,
        acquiredAtMs: 1,
        expireAtMs: 2,
      },
      {
        leaseId: "lease-3",
        selector: { type: "1", resourceId: "dev-b" },
        owner: { workspaceId: "ws-b", instanceId: "", sessionId: "", actor: "actor-2" },
        mode: "LOCK_MODE_EXCLUSIVE",
        fencingToken: 3,
        acquiredAtMs: 1,
        expireAtMs: 2,
      },
    ],
  });

  assert.equal(snapshotGroups[0]?.resourceId, "dev-a");
  assert.equal(snapshotGroups[0]?.total, 2);
  assert.equal(snapshotGroups[0]?.holders[0]?.holder, "ws-a/actor-1");
  assert.equal(snapshotGroups[0]?.holders[0]?.leaseIds.join(","), "lease-1,lease-2");

  const workspaceSummary = buildWorkspacePrecheckDiagnosticSummary({
    workspaceId: "ws-dev",
    topologyId: "topo-main",
    precheck: {
      code: "LOCK_CONFLICT",
      message: "resource occupied",
      topologyErrors: [{ message: "board missing" }],
      lockConflicts: [
        {
          selector: { type: "1", resourceId: "dev-a" },
          holderLeaseId: "",
          holderOwner: { workspaceId: "ws-a", instanceId: "", sessionId: "", actor: "actor-1" },
          holderFencingToken: 0,
          holderExpireAtMs: 0,
          suggestion: "",
        },
      ],
    },
    lockSnapshot: {
      leases: [
        {
          leaseId: "lease-1",
          selector: { type: "1", resourceId: "dev-a" },
          owner: { workspaceId: "ws-a", instanceId: "", sessionId: "", actor: "actor-1" },
          mode: "LOCK_MODE_EXCLUSIVE",
          fencingToken: 1,
          acquiredAtMs: 1,
          expireAtMs: 2,
        },
      ],
    },
    generatedAtMs: 1,
  });

  assert(workspaceSummary.includes("workspace=ws-dev, topology=topo-main"));
  assert(workspaceSummary.includes("code=LOCK_CONFLICT, message=resource occupied"));
  assert(workspaceSummary.includes("TopologyErrors:"));
  assert(workspaceSummary.includes("ConflictGroups:"));
  assert(workspaceSummary.includes("SnapshotGroups:"));

  const workspacePayload = buildWorkspacePrecheckDiagnosticPayload({
    workspaceId: "ws-dev",
    topologyId: "topo-main",
    precheck: {
      code: "LOCK_CONFLICT",
      message: "resource occupied",
      topologyErrors: [{ message: "board missing" }],
      lockConflicts: [
        {
          selector: { type: "1", resourceId: "dev-a" },
          holderLeaseId: "",
          holderOwner: { workspaceId: "ws-a", instanceId: "", sessionId: "", actor: "actor-1" },
          holderFencingToken: 0,
          holderExpireAtMs: 0,
          suggestion: "",
        },
      ],
    },
    lockSnapshot: {
      leases: [
        {
          leaseId: "lease-1",
          selector: { type: "1", resourceId: "dev-a" },
          owner: { workspaceId: "ws-a", instanceId: "", sessionId: "", actor: "actor-1" },
          mode: "LOCK_MODE_EXCLUSIVE",
          fencingToken: 1,
          acquiredAtMs: 1,
          expireAtMs: 2,
        },
      ],
    },
    generatedAtMs: 1,
    requestId: "req-123",
    channel: "workspace-editor",
  });

  assert.equal(workspacePayload.schemaVersion, "1.1.0");
  assert.equal(workspacePayload.requestId, "req-123");
  assert.equal(workspacePayload.channel, "workspace-editor");
  assert.equal(workspacePayload.workspaceId, "ws-dev");
  assert.equal(workspacePayload.topologyId, "topo-main");
  assert.equal(workspacePayload.code, "LOCK_CONFLICT");
  assert.equal(workspacePayload.snapshotAvailable, true);
  assert.equal(workspacePayload.counts.lockConflicts, 1);
  assert.equal(workspacePayload.conflictGroups[0]?.resourceId, "dev-a");
  assert.equal(workspacePayload.snapshotGroups[0]?.holders[0]?.leaseIds[0], "lease-1");

  process.stdout.write("lockDiagnostics.test passed\n");
})();
