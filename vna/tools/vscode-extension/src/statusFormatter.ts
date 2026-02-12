import type { ServiceStatus } from "./types";

export function formatServiceStatus(status: ServiceStatus): string {
  return [
    `state=${status.state}`,
    `ready=${status.ready}`,
    `message=${status.message}`,
    `uptimeMs=${status.uptimeMs}`,
    `bind=${status.bindAddress}:${status.port}`,
    `tls=${status.tlsEnabled}`,
    `log=${status.logLevel}`,
    `instances=${status.instanceCount}`,
    `leases=${status.activeLeaseCount}`,
  ].join(" | ");
}
