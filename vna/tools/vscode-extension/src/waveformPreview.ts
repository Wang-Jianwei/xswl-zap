import type { WaveformMarker, WaveformPoint, WaveformPreviewData } from "./types";

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildFrequencyPoints(frame: Record<string, unknown>): WaveformPoint[] {
  const points = frame.points;
  if (!Array.isArray(points)) {
    return [];
  }

  return points.map((point) => {
    const item = point as Record<string, unknown>;
    const real = toNumber(item.real);
    const imag = toNumber(item.imag);
    const magnitude = Math.sqrt(real * real + imag * imag);
    return {
      x: toNumber(item.frequencyHz),
      y: magnitude,
    };
  });
}

function buildTimePoints(frame: Record<string, unknown>): WaveformPoint[] {
  const points = frame.points;
  if (!Array.isArray(points)) {
    return [];
  }

  return points.map((point) => {
    const item = point as Record<string, unknown>;
    return {
      x: toNumber(item.timeNs),
      y: toNumber(item.magnitude),
    };
  });
}

function buildMarkers(points: WaveformPoint[]): WaveformMarker[] {
  if (points.length === 0) {
    return [];
  }

  let minPoint = points[0];
  let maxPoint = points[0];
  for (const point of points) {
    if (point.y < minPoint.y) {
      minPoint = point;
    }
    if (point.y > maxPoint.y) {
      maxPoint = point;
    }
  }

  return [
    { label: "min", x: minPoint.x, y: minPoint.y },
    { label: "max", x: maxPoint.x, y: maxPoint.y },
  ];
}

export function buildWaveformPreviewData(response: Record<string, unknown>): WaveformPreviewData {
  const frequencyFrame = response.frequencyFrame as Record<string, unknown> | undefined;
  const timeFrame = response.timeFrame as Record<string, unknown> | undefined;

  if (frequencyFrame) {
    const points = buildFrequencyPoints(frequencyFrame);
    return {
      instanceId: String(response.instanceId ?? ""),
      timestampNs: toNumber(response.timestampNs),
      frameType: "frequency",
      xLabel: "frequency_hz",
      yLabel: "magnitude",
      points,
      markers: buildMarkers(points),
    };
  }

  if (timeFrame) {
    const points = buildTimePoints(timeFrame);
    return {
      instanceId: String(response.instanceId ?? ""),
      timestampNs: toNumber(response.timestampNs),
      frameType: "time",
      xLabel: "time_ns",
      yLabel: "magnitude",
      points,
      markers: buildMarkers(points),
    };
  }

  return {
    instanceId: String(response.instanceId ?? ""),
    timestampNs: toNumber(response.timestampNs),
    frameType: "unknown",
    xLabel: "x",
    yLabel: "y",
    points: [],
    markers: [],
  };
}

function toPolyline(points: WaveformPoint[], width: number, height: number): string {
  if (points.length === 0) {
    return "";
  }

  const xValues = points.map((point) => point.x);
  const yValues = points.map((point) => point.y);

  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);

  const safeRangeX = Math.max(maxX - minX, 1e-12);
  const safeRangeY = Math.max(maxY - minY, 1e-12);

  return points
    .map((point) => {
      const x = ((point.x - minX) / safeRangeX) * (width - 20) + 10;
      const y = height - (((point.y - minY) / safeRangeY) * (height - 20) + 10);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export function buildWaveformPreviewHtml(data: WaveformPreviewData): string {
  const width = 900;
  const height = 360;
  const polyline = toPolyline(data.points, width, height);
  const markerText = data.markers
    .map((marker) => `${marker.label}: (${marker.x.toFixed(4)}, ${marker.y.toFixed(4)})`)
    .join(" | ");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>XSWL Waveform Preview</title>
  <style>
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 12px; }
    .meta { margin-bottom: 10px; }
    .axis { margin-bottom: 6px; opacity: 0.9; }
    .marker { margin-bottom: 10px; opacity: 0.9; }
    .chart { border: 1px solid var(--vscode-editorWidget-border); background: var(--vscode-editor-background); }
    .empty { opacity: 0.8; }
  </style>
</head>
<body>
  <div class="meta">instance=${data.instanceId} | frame=${data.frameType} | points=${data.points.length} | timestampNs=${data.timestampNs}</div>
  <div class="axis">x=${data.xLabel} | y=${data.yLabel}</div>
  <div class="marker">markers=${markerText || "none"}</div>
  ${
    data.points.length === 0
      ? "<div class=\"empty\">No waveform points available.</div>"
      : `<svg class="chart" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
           <polyline fill="none" stroke="var(--vscode-charts-blue)" stroke-width="2" points="${polyline}" />
         </svg>`
  }
</body>
</html>`;
}
