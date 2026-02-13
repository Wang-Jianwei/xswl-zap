export interface ServiceStatus {
  ready: boolean;
  state: string;
  message: string;
  bootstrapMode: string;
  configPath: string;
  uptimeMs: number;
  bindAddress: string;
  port: number;
  tlsEnabled: boolean;
  logLevel: string;
  instanceCount: number;
  activeLeaseCount: number;
}

export interface TopologyErrorDetail {
  code: string;
  field: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  errorDetails: TopologyErrorDetail[];
}

export interface AcquisitionSummary {
  instanceId: string;
  timestampNs: number;
  frameType: "frequency" | "time" | "unknown";
  pointCount: number;
}

export interface StreamPreviewFrame {
  frameCount: number;
  latestTimestampNs: number;
  lastFrameType: "frequency" | "time" | "unknown";
  lastPointCount: number;
}

export interface StreamPreviewSummary extends StreamPreviewFrame {
  canceled: boolean;
}

export interface WaveformPoint {
  x: number;
  y: number;
}

export interface WaveformPreviewData {
  instanceId: string;
  timestampNs: number;
  frameType: "frequency" | "time" | "unknown";
  points: WaveformPoint[];
}
