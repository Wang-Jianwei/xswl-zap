import type { LockConflictDetail, LockSnapshotResult } from "./types";

export interface LockSelectorRequest {
  type: number;
  resourceId: string;
}

export interface LockHolderCount {
  holder: string;
  count: number;
}

export interface LockConflictGroup {
  resourceId: string;
  total: number;
  holders: LockHolderCount[];
}

export interface LockSnapshotHolder extends LockHolderCount {
  leaseIds: string[];
}

export interface LockSnapshotGroup {
  resourceId: string;
  total: number;
  holders: LockSnapshotHolder[];
}

export interface WorkspacePrecheckDiagnosticSummaryParams {
  workspaceId: string;
  topologyId: string;
  precheck: {
    code: string;
    message: string;
    topologyErrors: Array<{ message: string }>;
    lockConflicts: LockConflictDetail[];
  };
  lockSnapshot: LockSnapshotResult | null;
  generatedAtMs: number;
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

export function groupLockConflicts(conflicts: LockConflictDetail[]): LockConflictGroup[] {
  const resourceMap = new Map<string, { total: number; holders: Map<string, number> }>();
  for (const item of conflicts) {
    const resourceId = String(item?.selector?.resourceId ?? "unknown-resource");
    const workspaceId = String(item?.holderOwner?.workspaceId ?? "unknown-workspace");
    const actor = String(item?.holderOwner?.actor ?? "unknown-actor");
    const holder = `${workspaceId}/${actor}`;

    const group = resourceMap.get(resourceId) ?? { total: 0, holders: new Map<string, number>() };
    group.total += 1;
    group.holders.set(holder, Number(group.holders.get(holder) ?? 0) + 1);
    resourceMap.set(resourceId, group);
  }

  return Array.from(resourceMap.entries())
    .map(([resourceId, value]) => ({
      resourceId,
      total: value.total,
      holders: Array.from(value.holders.entries())
        .map(([holder, count]) => ({ holder, count }))
        .sort((left, right) => {
          if (right.count !== left.count) {
            return right.count - left.count;
          }
          return left.holder.localeCompare(right.holder);
        }),
    }))
    .sort((left, right) => {
      if (right.total !== left.total) {
        return right.total - left.total;
      }
      return left.resourceId.localeCompare(right.resourceId);
    });
}

export function groupLockSnapshot(snapshot: LockSnapshotResult | null): LockSnapshotGroup[] {
  if (!snapshot || !Array.isArray(snapshot.leases)) {
    return [];
  }

  const resourceMap = new Map<string, { total: number; holders: Map<string, { count: number; leaseIds: string[] }> }>();
  for (const lease of snapshot.leases) {
    const resourceId = String(lease?.selector?.resourceId ?? "unknown-resource");
    const workspaceId = String(lease?.owner?.workspaceId ?? "unknown-workspace");
    const actor = String(lease?.owner?.actor ?? "unknown-actor");
    const holder = `${workspaceId}/${actor}`;

    const group = resourceMap.get(resourceId) ?? {
      total: 0,
      holders: new Map<string, { count: number; leaseIds: string[] }>(),
    };
    group.total += 1;

    const holderInfo = group.holders.get(holder) ?? { count: 0, leaseIds: [] };
    holderInfo.count += 1;
    const leaseId = String(lease?.leaseId ?? "").trim();
    if (leaseId.length > 0 && holderInfo.leaseIds.length < 2) {
      holderInfo.leaseIds.push(leaseId);
    }
    group.holders.set(holder, holderInfo);
    resourceMap.set(resourceId, group);
  }

  return Array.from(resourceMap.entries())
    .map(([resourceId, value]) => ({
      resourceId,
      total: value.total,
      holders: Array.from(value.holders.entries())
        .map(([holder, info]) => ({ holder, count: info.count, leaseIds: info.leaseIds }))
        .sort((left, right) => {
          if (right.count !== left.count) {
            return right.count - left.count;
          }
          return left.holder.localeCompare(right.holder);
        }),
    }))
    .sort((left, right) => {
      if (right.total !== left.total) {
        return right.total - left.total;
      }
      return left.resourceId.localeCompare(right.resourceId);
    });
}

export function buildWorkspacePrecheckDiagnosticSummary(
  params: WorkspacePrecheckDiagnosticSummaryParams,
): string {
  const workspaceId = String(params.workspaceId || "").trim() || "unknown-workspace";
  const topologyId = String(params.topologyId || "").trim() || "unknown-topology";
  const precheck = params.precheck;
  const code = String(precheck.code || "PRECHECK_FAILED");
  const message = String(precheck.message || "precheck failed");
  const topologyErrors = Array.isArray(precheck.topologyErrors) ? precheck.topologyErrors : [];
  const lockConflicts = Array.isArray(precheck.lockConflicts) ? precheck.lockConflicts : [];
  const conflictGroups = groupLockConflicts(lockConflicts);
  const snapshotGroups = groupLockSnapshot(params.lockSnapshot);
  const snapshotLeaseCount = params.lockSnapshot && Array.isArray(params.lockSnapshot.leases)
    ? params.lockSnapshot.leases.length
    : -1;

  const lines: string[] = [];
  lines.push("[XSWL VNA] Workspace Precheck Diagnostics");
  lines.push(`workspace=${workspaceId}, topology=${topologyId}`);
  lines.push(`code=${code}, message=${message}`);
  lines.push(`updatedAt=${new Date(params.generatedAtMs).toISOString()}`);
  lines.push(`topologyErrors=${topologyErrors.length}, lockConflicts=${lockConflicts.length}, snapshotLeases=${snapshotLeaseCount}`);

  if (topologyErrors.length > 0) {
    lines.push("TopologyErrors:");
    topologyErrors.slice(0, 5).forEach((item) => {
      lines.push(`- ${String(item?.message ?? "invalid topology")}`);
    });
  }

  if (conflictGroups.length > 0) {
    lines.push("ConflictGroups:");
    conflictGroups.slice(0, 8).forEach((group) => {
      lines.push(`- resource=${group.resourceId}, conflicts=${group.total}`);
      group.holders.slice(0, 4).forEach((holder) => {
        lines.push(`  - holder=${holder.holder}, count=${holder.count}`);
      });
    });
  }

  if (snapshotGroups.length > 0) {
    lines.push("SnapshotGroups:");
    snapshotGroups.slice(0, 8).forEach((group) => {
      lines.push(`- resource=${group.resourceId}, leases=${group.total}`);
      group.holders.slice(0, 4).forEach((holder) => {
        const leaseText = holder.leaseIds.length > 0 ? `, lease=${holder.leaseIds.join(",")}` : "";
        lines.push(`  - holder=${holder.holder}, count=${holder.count}${leaseText}`);
      });
    });
  }

  return lines.join("\n");
}
