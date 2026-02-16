import type { LockConflictDetail, LockSnapshotResult } from "./types";

export interface LockSelectorRequest {
  type: number;
  resourceId: string;
}

export function collectConflictSelectors(conflicts: LockConflictDetail[]): LockSelectorRequest[] {
  const dedup = new Map<string, LockSelectorRequest>();
  for (const conflict of conflicts) {
    const resourceId = String(conflict?.selector?.resourceId ?? "").trim();
    if (!resourceId) {
      continue;
    }
    const type = Number.parseInt(String(conflict?.selector?.type ?? "1"), 10);
    const normalizedType = Number.isFinite(type) && type > 0 ? type : 1;
    const key = `${normalizedType}:${resourceId}`;
    if (!dedup.has(key)) {
      dedup.set(key, { type: normalizedType, resourceId });
    }
  }
  return Array.from(dedup.values());
}

export function buildLockSnapshotSummary(
  snapshot: LockSnapshotResult | null,
  conflictCount: number,
  maxRows = 3,
): string {
  if (!snapshot) {
    return "Lock snapshot unavailable on current server.";
  }

  if (!Array.isArray(snapshot.leases) || snapshot.leases.length === 0) {
    return conflictCount > 0
      ? "Lock snapshot: no active leases on conflicted resources."
      : "Lock snapshot: no active leases.";
  }

  const lines = snapshot.leases.slice(0, maxRows).map((lease) => {
    const resourceId = String(lease?.selector?.resourceId ?? "unknown-resource");
    const workspaceId = String(lease?.owner?.workspaceId ?? "unknown-workspace");
    const actor = String(lease?.owner?.actor ?? "unknown-actor");
    return `resource=${resourceId}, holder=${workspaceId}/${actor}`;
  });

  const remaining = snapshot.leases.length - lines.length;
  if (remaining > 0) {
    lines.push(`... +${remaining} more leases`);
  }
  return `Lock snapshot:\n${lines.join("\n")}`;
}
