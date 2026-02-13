import type {
  AcquisitionSummary,
  ServiceStatus,
  StreamPreviewSummary,
  ValidationResult,
} from "./types";

export function formatServiceStatus(status: ServiceStatus): string {
  let normalizedMessage = status.message;
  let legacyConfigPath = "";

  const marker = " | config=";
  const markerIndex = status.message.indexOf(marker);
  if (markerIndex >= 0) {
    normalizedMessage = status.message.substring(0, markerIndex);
    legacyConfigPath = status.message.substring(markerIndex + marker.length);
  }

  const configPath = status.configPath.length > 0 ? status.configPath : legacyConfigPath;
  const bootstrapMode = status.bootstrapMode;

  const fields = [
    `state=${status.state}`,
    `ready=${status.ready}`,
    `message=${normalizedMessage}`,
    `uptimeMs=${status.uptimeMs}`,
    `bind=${status.bindAddress}:${status.port}`,
    `tls=${status.tlsEnabled}`,
    `log=${status.logLevel}`,
    `instances=${status.instanceCount}`,
    `leases=${status.activeLeaseCount}`,
  ];

  if (configPath.length > 0) {
    fields.push(`configPath=${configPath}`);
  }

  if (bootstrapMode.length > 0) {
    fields.push(`bootstrapMode=${bootstrapMode}`);
  }

  return fields.join(" | ");
}

export function formatValidationResult(result: ValidationResult): string {
  if (result.ok) {
    return "ok=true | errors=0";
  }

  const firstError = result.errors.length > 0 ? result.errors[0] : "unknown validation error";
  return `ok=false | errors=${result.errors.length} | first=${firstError}`;
}

export function formatAcquisitionSummary(summary: AcquisitionSummary): string {
  return [
    `instanceId=${summary.instanceId}`,
    `timestampNs=${summary.timestampNs}`,
    `frame=${summary.frameType}`,
    `points=${summary.pointCount}`,
  ].join(" | ");
}

export function formatStreamPreviewSummary(summary: StreamPreviewSummary): string {
  return [
    `frames=${summary.frameCount}`,
    `latestTimestampNs=${summary.latestTimestampNs}`,
    `lastFrame=${summary.lastFrameType}`,
    `lastPoints=${summary.lastPointCount}`,
    `canceled=${summary.canceled}`,
  ].join(" | ");
}

export function formatServiceStatusMultiline(status: ServiceStatus): string {
  return formatServiceStatus(status).replace(/ \| /g, "\n");
}
