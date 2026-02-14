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

export type WaveformMode = "frequency" | "time";

export type WaveformTraceSource =
  | "frame"
  | "receiverRaw"
  | "receiverCompensated"
  | "sParameterS11"
  | "all";

export interface WaveformMarker {
  label: string;
  x: number;
  y: number;
}

export interface WaveformTrace {
  id: string;
  label: string;
  color: string;
  points: WaveformPoint[];
  markers: WaveformMarker[];
}

export type LiveStatsLevel = "normal" | "warning" | "critical";

export interface LiveWaveformStats {
  peakToPeak: number;
  mean: number;
  stdDev: number;
  coefficientOfVariation: number;
  level: LiveStatsLevel;
  window: number;
}

export type WaveformScanState = "continuous" | "single" | "hold";

export interface WaveformPreviewData {
  instanceId: string;
  timestampNs: number;
  frameType: "frequency" | "time" | "unknown";
  xLabel: string;
  yLabel: string;
  traceSource: WaveformTraceSource;
  channelIndex: number;
  visibleTraceIds: string[];
  traces: WaveformTrace[];
  points: WaveformPoint[];
  markers: WaveformMarker[];
  liveStats?: LiveWaveformStats;
  scanState?: WaveformScanState;
  streamActive?: boolean;
  streamFrameCount?: number;
}
