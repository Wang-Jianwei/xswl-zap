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
  return makeTrace(id, `${label} ch${channelIndex}`, color, points);
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
  visibleTraceIds: string[] = [],
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
      const allTraces = [frameTrace, receiverRawTrace, receiverCompTrace, s11Trace].filter(
        (trace): trace is WaveformTrace => trace !== null,
      );
      const selected = new Set(visibleTraceIds);
      traces =
        selected.size === 0
          ? allTraces
          : allTraces.filter((trace) => selected.has(trace.id));
      if (traces.length === 0) {
        traces = allTraces;
      }
    } else {
      const selected = sourceMap[traceSource] ?? frameTrace;
      traces = selected ? [selected] : [frameTrace];
    }

    const primary = traces[0] ?? frameTrace;
    const normalizedVisibleTraceIds =
      traceSource === "all" ? traces.map((trace) => trace.id) : [primary.id];
    return {
      instanceId: String(response.instanceId ?? ""),
      timestampNs: toNumber(response.timestampNs),
      frameType: "frequency",
      xLabel: "frequency_hz",
      yLabel: "magnitude",
      traceSource,
      channelIndex,
      visibleTraceIds: normalizedVisibleTraceIds,
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
      visibleTraceIds: [trace.id],
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
    visibleTraceIds: [],
    traces: [],
    points: [],
    markers: [],
  };
}

function toPolyline(points: WaveformPoint[], width: number, height: number): string {
  if (points.length === 0) {
    return "";
  }

  const bounds = getPointBounds(points);

  return points
    .map((point) => {
      const normalized = normalizePoint(point, bounds, width, height);
      return `${normalized.x.toFixed(2)},${normalized.y.toFixed(2)}`;
    })
    .join(" ");
}

function getPointBounds(points: WaveformPoint[]): { minX: number; maxX: number; minY: number; maxY: number } {
  if (points.length === 0) {
    return {
      minX: 0,
      maxX: 1,
      minY: 0,
      maxY: 1,
    };
  }

  const xValues = points.map((point) => point.x);
  const yValues = points.map((point) => point.y);

  return {
    minX: Math.min(...xValues),
    maxX: Math.max(...xValues),
    minY: Math.min(...yValues),
    maxY: Math.max(...yValues),
  };
}

function normalizePoint(
  point: WaveformPoint,
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  width: number,
  height: number,
): WaveformPoint {
  const safeRangeX = Math.max(bounds.maxX - bounds.minX, 1e-12);
  const safeRangeY = Math.max(bounds.maxY - bounds.minY, 1e-12);

  return {
    x: ((point.x - bounds.minX) / safeRangeX) * (width - 20) + 10,
    y: height - (((point.y - bounds.minY) / safeRangeY) * (height - 20) + 10),
  };
}

function toNormalizedPoints(points: WaveformPoint[], width: number, height: number): WaveformPoint[] {
  if (points.length === 0) {
    return [];
  }

  const bounds = getPointBounds(points);
  return points.map((point) => normalizePoint(point, bounds, width, height));
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

function renderTraceMarkers(trace: WaveformTrace, width: number, height: number, isPrimary: boolean): string {
  if (trace.points.length === 0 || trace.markers.length === 0) {
    return "";
  }

  const bounds = getPointBounds(trace.points);
  return trace.markers
    .map((marker) => {
      const normalized = normalizePoint({ x: marker.x, y: marker.y }, bounds, width, height);
      const label = isPrimary
        ? `${marker.label} x=${formatTick(marker.x)} y=${formatTick(marker.y)}`
        : `${marker.label}`;
      const textX = normalized.x + 6;
      const textY = normalized.y - 6;
      const labelWidth = Math.max(30, Math.min(240, label.length * 6.4 + 10));
      const labelHeight = 14;
      const labelRect = isPrimary
        ? `<rect class="marker-label-bg" x="${textX.toFixed(2)}" y="${(textY - 10).toFixed(2)}" width="${labelWidth.toFixed(2)}" height="${labelHeight}" rx="3" ry="3" />`
        : "";
      return `<g class="marker-point" data-trace-id="${trace.id}">
  <circle cx="${normalized.x.toFixed(2)}" cy="${normalized.y.toFixed(2)}" r="3" fill="${trace.color}" stroke="var(--vscode-editor-background)" stroke-width="1.2" />
  ${labelRect}
  <text class="marker-label-text" x="${textX.toFixed(2)}" y="${textY.toFixed(2)}">${label}</text>
</g>`;
    })
    .join("\n");
}

function formatTick(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }

  const abs = Math.abs(value);
  if (abs >= 1.0e6 || (abs > 0 && abs < 1.0e-3)) {
    return value.toExponential(3);
  }
  return value.toFixed(3);
}

function getTraceBounds(traces: WaveformTrace[]): { minX: number; maxX: number; minY: number; maxY: number } {
  const points = traces.flatMap((trace) => trace.points);
  if (points.length === 0) {
    return {
      minX: 0,
      maxX: 1,
      minY: 0,
      maxY: 1,
    };
  }

  const xValues = points.map((point) => point.x);
  const yValues = points.map((point) => point.y);
  return {
    minX: Math.min(...xValues),
    maxX: Math.max(...xValues),
    minY: Math.min(...yValues),
    maxY: Math.max(...yValues),
  };
}

function renderAxes(
  width: number,
  height: number,
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
): string {
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

  const ticks = `<text class="axis-tick" x="${left}" y="${height - 2}" text-anchor="start">xMin=${formatTick(bounds.minX)}</text>
<text class="axis-tick" x="${right}" y="${height - 2}" text-anchor="end">xMax=${formatTick(bounds.maxX)}</text>
<text class="axis-tick" x="${left + 2}" y="${top + 12}" text-anchor="start">yMax=${formatTick(bounds.maxY)}</text>
<text class="axis-tick" x="${left + 2}" y="${bottom - 4}" text-anchor="start">yMin=${formatTick(bounds.minY)}</text>`;

  return `${horizontal}\n${vertical}\n${axes}\n${ticks}`;
}

export function buildWaveformPreviewHtml(data: WaveformPreviewData): string {
  const width = 900;
  const height = 360;
  const primaryTraceId = data.traces[0]?.id ?? "";
  const primaryTrace = data.traces[0];
  const primaryMarkerCopyText = primaryTrace
    ? `timestampNs=${data.timestampNs} | source=${data.traceSource} | channel=${data.channelIndex} | ${primaryTrace.label} | ${primaryTrace.markers
        .map((marker) => `${marker.label}: x=${formatTick(marker.x)}, y=${formatTick(marker.y)}`)
        .join("; ")}`
    : "";
  const copyTitle = primaryMarkerCopyText
    ? `Copy primary marker to clipboard (${primaryMarkerCopyText.length} chars)`
    : "No primary marker available";
  const markerEntries = data.traces
    .map((trace) => {
      const text = trace.markers
        .map((marker) => `${marker.label}=(${marker.x.toFixed(4)}, ${marker.y.toFixed(4)})`)
        .join(", ");
      const sortValue = Math.max(...trace.markers.map((marker) => marker.y));
      return {
        trace,
        text,
        sortValue: Number.isFinite(sortValue) ? sortValue : Number.NEGATIVE_INFINITY,
      };
    })
    .sort((left, right) => {
      if (left.trace.id === primaryTraceId) {
        return -1;
      }
      if (right.trace.id === primaryTraceId) {
        return 1;
      }
      return right.sortValue - left.sortValue;
    });

  const legendItems = markerEntries
    .map(
      ({ trace }) =>
        `<button type="button" class="legend-item ${trace.id === primaryTraceId ? "is-primary" : ""}" data-trace-id="${trace.id}" title="toggle ${trace.label}"><span class="legend-dot" style="background:${trace.color}"></span>${trace.label}</button>`,
    )
    .join("");
  const markerRows = markerEntries
    .map(({ trace, text }) => {
      return `<div class="marker-row ${trace.id === primaryTraceId ? "is-primary" : ""}" data-trace-id="${trace.id}"><span class="marker-name">${trace.label}</span><span class="marker-values">${text || "none"}</span></div>`;
    })
    .join("");
  const legendText = data.traces.map((trace) => `${trace.label}:${trace.color}`).join(" | ");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>XSWL Waveform Preview</title>
  <style>
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 12px; }
    .meta { margin-bottom: 10px; }
    .axis { margin-bottom: 6px; opacity: 0.9; }
    .marker { margin-bottom: 10px; opacity: 0.9; display: grid; gap: 4px; }
    .marker-row { display: flex; gap: 8px; align-items: baseline; }
    .marker-row.is-hidden { opacity: 0.45; text-decoration: line-through; }
    .marker-row.is-primary { border-left: 2px solid var(--vscode-focusBorder); padding-left: 6px; }
    .marker-name { font-weight: 600; min-width: 150px; }
    .marker-values { opacity: 0.9; }
    .legend { margin-bottom: 8px; display: flex; gap: 8px; flex-wrap: wrap; }
    .actions { margin-bottom: 8px; display: flex; gap: 8px; }
    .copy-status {
      margin-bottom: 8px;
      padding: 4px 8px;
      border: 1px solid var(--vscode-editorWidget-border);
      border-radius: 4px;
      font-size: 12px;
      opacity: 0.9;
      display: none;
    }
    .copy-status.is-success {
      display: block;
      color: var(--vscode-testing-iconPassed);
      border-color: var(--vscode-testing-iconPassed);
    }
    .copy-status.is-error {
      display: block;
      color: var(--vscode-testing-iconFailed);
      border-color: var(--vscode-testing-iconFailed);
    }
    .action-btn {
      border: 1px solid var(--vscode-editorWidget-border);
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border-radius: 4px;
      padding: 3px 10px;
      cursor: pointer;
      font-size: 12px;
    }
    .action-btn[disabled] { opacity: 0.5; cursor: default; }
    .shortcut-hint { font-size: 11px; opacity: 0.75; margin-left: 2px; }
    .legend-item {
      border: 1px solid var(--vscode-editorWidget-border);
      background: var(--vscode-editor-background);
      color: var(--vscode-foreground);
      border-radius: 4px;
      padding: 2px 8px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .legend-item.is-hidden { opacity: 0.45; text-decoration: line-through; }
    .legend-item.is-primary { border-color: var(--vscode-focusBorder); }
    .legend-dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
    .chart { border: 1px solid var(--vscode-editorWidget-border); background: var(--vscode-editor-background); }
    .chart .grid-line { stroke: var(--vscode-descriptionForeground); stroke-width: 1; opacity: 0.25; }
    .chart .axis-line { stroke: var(--vscode-foreground); stroke-width: 1.2; opacity: 0.7; }
    .chart .axis-tick { fill: var(--vscode-descriptionForeground); font-size: 11px; opacity: 0.9; }
    .chart .marker-point text { fill: var(--vscode-foreground); font-size: 10px; opacity: 0.95; }
    .chart .marker-label-bg { fill: var(--vscode-editor-background); stroke: var(--vscode-focusBorder); stroke-width: 0.8; opacity: 0.95; }
    .chart .marker-label-text { fill: var(--vscode-foreground); font-size: 9.5px; letter-spacing: 0.1px; }
    .empty { opacity: 0.8; }
  </style>
</head>
<body>
  <div class="meta">instance=${data.instanceId} | frame=${data.frameType} | source=${data.traceSource} | channel=${data.channelIndex} | visible=${data.visibleTraceIds.join(",") || "all"} | points=${data.points.length} | timestampNs=${data.timestampNs}</div>
  <div class="axis">x=${data.xLabel} | y=${data.yLabel}</div>
  <div class="axis">legend=${legendText || "none"}</div>
  <div class="actions">
    <button id="copyPrimaryMarker" class="action-btn" ${primaryMarkerCopyText ? "" : "disabled"} title="${copyTitle}" data-copy-text="${primaryMarkerCopyText.replace(/"/g, "&quot;")}">Copy Primary Marker</button>
    <span class="shortcut-hint" title="Ctrl/Cmd + C to copy primary marker">Ctrl/Cmd + C</span>
  </div>
  <div id="copyStatus" class="copy-status" aria-live="polite"></div>
  <div class="legend" id="legend">${legendItems}</div>
  <div class="marker" id="markerPanel">${markerRows || "none"}</div>
  ${
    data.traces.length === 0
      ? "<div class=\"empty\">No waveform points available.</div>"
      : `<svg class="chart" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
         ${renderAxes(width, height, getTraceBounds(data.traces))}
           ${data.traces
             .map((trace) => `<g data-trace-id="${trace.id}">${renderTrace(trace, width, height)}</g>\n${renderTraceMarkers(trace, width, height, trace.id === primaryTraceId)}`)
             .join("\n")}
         </svg>`
  }
  <script>
    (function () {
      const vscodeApi = typeof acquireVsCodeApi === "function" ? acquireVsCodeApi() : undefined;
      const copyButton = document.getElementById("copyPrimaryMarker");
      const copyStatus = document.getElementById("copyStatus");
      let statusTimer = undefined;
      let lastCopyStartedAt = 0;
      let buttonResetTimer = undefined;
      const clearCopyStatus = () => {
        if (!(copyStatus instanceof HTMLElement)) {
          return;
        }
        copyStatus.classList.remove("is-success", "is-error");
        copyStatus.textContent = "";
        copyStatus.style.display = "";
      };
      const updateCopyStatus = (ok, message) => {
        if (!(copyStatus instanceof HTMLElement)) {
          return;
        }
        const timeText = new Date().toLocaleTimeString();
        copyStatus.classList.remove("is-success", "is-error");
        copyStatus.classList.add(ok ? "is-success" : "is-error");
        copyStatus.textContent = message + " (" + timeText + ")";
        if (statusTimer) {
          clearTimeout(statusTimer);
        }
        statusTimer = setTimeout(() => {
          clearCopyStatus();
        }, 2000);
      };

      const setCopying = () => {
        if (copyButton instanceof HTMLButtonElement) {
          copyButton.disabled = true;
          copyButton.textContent = "Copying...";
        }
        if (copyStatus instanceof HTMLElement) {
          copyStatus.classList.remove("is-success", "is-error");
          copyStatus.textContent = "Copying...";
          copyStatus.style.display = "block";
        }
      };

      const finishCopying = () => {
        if (copyButton instanceof HTMLButtonElement && copyButton.getAttribute("data-copy-text")) {
          copyButton.disabled = false;
          if (buttonResetTimer) {
            clearTimeout(buttonResetTimer);
          }
          buttonResetTimer = setTimeout(() => {
            if (copyButton instanceof HTMLButtonElement) {
              copyButton.textContent = "Copy Primary Marker";
            }
          }, 1200);
        }
      };

      const markCopied = () => {
        if (copyButton instanceof HTMLButtonElement) {
          copyButton.textContent = "Copied!";
        }
      };

      const copyPrimaryMarker = async () => {
        if (!(copyButton instanceof HTMLButtonElement) || copyButton.disabled) {
          return;
        }
        const now = Date.now();
        if (now - lastCopyStartedAt < 500) {
          return;
        }
        lastCopyStartedAt = now;
        const copyText = copyButton.getAttribute("data-copy-text") || "";
        if (!copyText) {
          return;
        }
        setCopying();
        if (vscodeApi) {
          vscodeApi.postMessage({ type: "copy-primary-marker", text: copyText });
          return;
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          try {
            await navigator.clipboard.writeText(copyText);
            updateCopyStatus(true, "Primary marker copied.");
            markCopied();
          } catch (error) {
            updateCopyStatus(false, "Copy failed.");
          } finally {
            finishCopying();
          }
        }
      };

      if (copyButton instanceof HTMLButtonElement && !copyButton.disabled) {
        copyButton.addEventListener("click", copyPrimaryMarker);
      }

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          clearCopyStatus();
          return;
        }
        const isCopyHotkey = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c";
        if (!isCopyHotkey) {
          return;
        }
        const active = document.activeElement;
        if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
          return;
        }
        event.preventDefault();
        void copyPrimaryMarker();
      });

      window.addEventListener("message", (event) => {
        const payload = event.data;
        if (!payload || payload.type !== "copy-primary-marker-result") {
          return;
        }
        updateCopyStatus(Boolean(payload.ok), String(payload.message || ""));
        if (Boolean(payload.ok)) {
          markCopied();
        }
        finishCopying();
      });

      const legend = document.getElementById("legend");
      if (!legend) {
        return;
      }
      legend.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
          return;
        }
        const item = target.closest(".legend-item");
        if (!(item instanceof HTMLElement)) {
          return;
        }
        const traceId = item.getAttribute("data-trace-id");
        if (!traceId) {
          return;
        }
        const groups = document.querySelectorAll("g[data-trace-id=\"" + traceId + "\"]");
        const markerRows = document.querySelectorAll(".marker-row[data-trace-id=\"" + traceId + "\"]");
        const hidden = item.classList.toggle("is-hidden");
        groups.forEach((group) => {
          if (group instanceof HTMLElement) {
            group.style.display = hidden ? "none" : "";
          }
        });
        markerRows.forEach((row) => {
          if (row instanceof HTMLElement) {
            row.classList.toggle("is-hidden", hidden);
          }
        });
      });
    })();
  </script>
</body>
</html>`;
}
