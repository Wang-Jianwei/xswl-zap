import type {
  WaveformMarker,
  WaveformPoint,
  WaveformPreviewData,
  WaveformTrace,
  WaveformTraceSource,
} from "./types";

const kMaxRenderPoints = 512;

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

function downsample(points: WaveformPoint[], maxPoints = kMaxRenderPoints): WaveformPoint[] {
  if (points.length <= maxPoints) {
    return points;
  }

  const sampled: WaveformPoint[] = [];
  const step = (points.length - 1) / (maxPoints - 1);
  for (let i = 0; i < maxPoints; i += 1) {
    const index = Math.min(points.length - 1, Math.round(i * step));
    sampled.push(points[index]);
  }
  return sampled;
}

function makeTrace(id: string, label: string, color: string, points: WaveformPoint[]): WaveformTrace {
  const normalized = downsample(points);
  return {
    id,
    label,
    color,
    points: normalized,
    markers: buildMarkers(normalized),
  };
}

function buildReceiverTrace(
  response: Record<string, unknown>,
  key: string,
  id: string,
  label: string,
  color: string,
  channelIndex: number,
): WaveformTrace | null {
  const raw = response[key];
  if (!Array.isArray(raw)) {
    return null;
  }

  const points: WaveformPoint[] = [];
  for (const entry of raw) {
    const row = entry as Record<string, unknown>;
    const channels = row.channels;
    if (!Array.isArray(channels) || channels.length <= channelIndex) {
      continue;
    }
    const channel = channels[channelIndex] as Record<string, unknown>;
    const real = toNumber(channel.real);
    const imag = toNumber(channel.imag);
    points.push({
      x: toNumber(row.frequencyHz),
      y: Math.sqrt(real * real + imag * imag),
    });
  }

  if (points.length === 0) {
    return null;
  }
  return makeTrace(`${id}Ch${channelIndex}`, `${label} ch${channelIndex}`, color, points);
}

function buildS11Trace(response: Record<string, unknown>): WaveformTrace | null {
  const raw = response.sParameterPoints;
  if (!Array.isArray(raw)) {
    return null;
  }

  const points: WaveformPoint[] = [];
  for (const entry of raw) {
    const row = entry as Record<string, unknown>;
    const matrixPoints = row.points;
    if (!Array.isArray(matrixPoints)) {
      continue;
    }
    const s11 = matrixPoints.find((item) => {
      const value = item as Record<string, unknown>;
      return toNumber(value.rowPort) === 1 && toNumber(value.colPort) === 1;
    }) as Record<string, unknown> | undefined;

    if (!s11) {
      continue;
    }

    const real = toNumber(s11.real);
    const imag = toNumber(s11.imag);
    points.push({
      x: toNumber(row.frequencyHz),
      y: Math.sqrt(real * real + imag * imag),
    });
  }

  if (points.length === 0) {
    return null;
  }
  return makeTrace("s11", "s-parameter s11", "#c586c0", points);
}

export function buildWaveformPreviewData(
  response: Record<string, unknown>,
  traceSource: WaveformTraceSource = "frame",
  channelIndex = 0,
): WaveformPreviewData {
  const frequencyFrame = response.frequencyFrame as Record<string, unknown> | undefined;
  const timeFrame = response.timeFrame as Record<string, unknown> | undefined;

  if (frequencyFrame) {
    const frameTrace = makeTrace("frame", "frame", "#4ec9b0", buildFrequencyPoints(frequencyFrame));
    const receiverRawTrace =
      buildReceiverTrace(response, "receiverRawPoints", "receiverRaw", "receiver raw", "#569cd6", channelIndex);
    const receiverCompTrace = buildReceiverTrace(
      response,
      "receiverCompensatedPoints",
      "receiverCompensated",
      "receiver compensated",
      "#dcdcaa",
      channelIndex,
    );
    const s11Trace = buildS11Trace(response);

    const sourceMap: Record<string, WaveformTrace | null> = {
      frame: frameTrace,
      receiverRaw: receiverRawTrace,
      receiverCompensated: receiverCompTrace,
      sParameterS11: s11Trace,
    };

    let traces: WaveformTrace[] = [];
    if (traceSource === "all") {
      traces = [frameTrace, receiverRawTrace, receiverCompTrace, s11Trace].filter(
        (trace): trace is WaveformTrace => trace !== null,
      );
    } else {
      const selected = sourceMap[traceSource] ?? frameTrace;
      traces = selected ? [selected] : [frameTrace];
    }

    const primary = traces[0] ?? frameTrace;
    return {
      instanceId: String(response.instanceId ?? ""),
      timestampNs: toNumber(response.timestampNs),
      frameType: "frequency",
      xLabel: "frequency_hz",
      yLabel: "magnitude",
      traceSource,
      channelIndex,
      traces,
      points: primary.points,
      markers: primary.markers,
    };
  }

  if (timeFrame) {
    const trace = makeTrace("time", "time frame", "#4ec9b0", buildTimePoints(timeFrame));
    return {
      instanceId: String(response.instanceId ?? ""),
      timestampNs: toNumber(response.timestampNs),
      frameType: "time",
      xLabel: "time_ns",
      yLabel: "magnitude",
      traceSource: "frame",
      channelIndex,
      traces: [trace],
      points: trace.points,
      markers: trace.markers,
    };
  }

  return {
    instanceId: String(response.instanceId ?? ""),
    timestampNs: toNumber(response.timestampNs),
    frameType: "unknown",
    xLabel: "x",
    yLabel: "y",
    traceSource,
    channelIndex,
    traces: [],
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

function toNormalizedPoints(points: WaveformPoint[], width: number, height: number): WaveformPoint[] {
  if (points.length === 0) {
    return [];
  }

  const xValues = points.map((point) => point.x);
  const yValues = points.map((point) => point.y);

  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);

  const safeRangeX = Math.max(maxX - minX, 1e-12);
  const safeRangeY = Math.max(maxY - minY, 1e-12);

  return points.map((point) => ({
    x: ((point.x - minX) / safeRangeX) * (width - 20) + 10,
    y: height - (((point.y - minY) / safeRangeY) * (height - 20) + 10),
  }));
}

function renderTrace(trace: WaveformTrace, width: number, height: number): string {
  if (trace.points.length === 0) {
    return "";
  }

  if (trace.points.length === 1) {
    const normalized = toNormalizedPoints(trace.points, width, height);
    const point = normalized[0];
    return `<circle cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="3.5" fill="${trace.color}" />`;
  }

  const points = toPolyline(trace.points, width, height);
  return `<polyline fill="none" stroke="${trace.color}" stroke-width="2" points="${points}" />`;
}

function renderAxes(width: number, height: number): string {
  const padding = 10;
  const left = padding;
  const right = width - padding;
  const top = padding;
  const bottom = height - padding;
  const divisions = 4;

  const horizontal = Array.from({ length: divisions + 1 }, (_, idx) => {
    const y = top + ((bottom - top) * idx) / divisions;
    return `<line class="grid-line" x1="${left}" y1="${y.toFixed(2)}" x2="${right}" y2="${y.toFixed(2)}" />`;
  }).join("\n");

  const vertical = Array.from({ length: divisions + 1 }, (_, idx) => {
    const x = left + ((right - left) * idx) / divisions;
    return `<line class="grid-line" x1="${x.toFixed(2)}" y1="${top}" x2="${x.toFixed(2)}" y2="${bottom}" />`;
  }).join("\n");

  const axes = `<line class="axis-line" x1="${left}" y1="${bottom}" x2="${right}" y2="${bottom}" />
<line class="axis-line" x1="${left}" y1="${top}" x2="${left}" y2="${bottom}" />`;

  return `${horizontal}\n${vertical}\n${axes}`;
}

export function buildWaveformPreviewHtml(data: WaveformPreviewData): string {
  const width = 900;
  const height = 360;
  const markerText = data.traces
    .map((trace) => {
      const text = trace.markers
        .map((marker) => `${marker.label}=(${marker.x.toFixed(4)}, ${marker.y.toFixed(4)})`)
        .join(", ");
      return `${trace.label}[${text}]`;
    })
    .join(" | ");
  const legendText = data.traces.map((trace) => `${trace.label}:${trace.color}`).join(" | ");

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
    .chart .grid-line { stroke: var(--vscode-descriptionForeground); stroke-width: 1; opacity: 0.25; }
    .chart .axis-line { stroke: var(--vscode-foreground); stroke-width: 1.2; opacity: 0.7; }
    .empty { opacity: 0.8; }
  </style>
</head>
<body>
  <div class="meta">instance=${data.instanceId} | frame=${data.frameType} | source=${data.traceSource} | channel=${data.channelIndex} | points=${data.points.length} | timestampNs=${data.timestampNs}</div>
  <div class="axis">x=${data.xLabel} | y=${data.yLabel}</div>
  <div class="axis">legend=${legendText || "none"}</div>
  <div class="marker">markers=${markerText || "none"}</div>
  ${
    data.traces.length === 0
      ? "<div class=\"empty\">No waveform points available.</div>"
       : `<svg class="chart" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
         ${renderAxes(width, height)}
           ${data.traces
             .map((trace) => renderTrace(trace, width, height))
             .join("\n")}
         </svg>`
  }
</body>
</html>`;
}
