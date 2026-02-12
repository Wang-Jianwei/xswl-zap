export interface ServiceStatus {
  ready: boolean;
  state: string;
  message: string;
  uptimeMs: number;
  bindAddress: string;
  port: number;
  tlsEnabled: boolean;
  logLevel: string;
  instanceCount: number;
  activeLeaseCount: number;
}
