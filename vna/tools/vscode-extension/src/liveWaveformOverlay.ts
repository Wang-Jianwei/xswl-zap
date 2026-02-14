import type {
  LiveStatsLevel,
  LiveWaveformStats,
  WaveformMarker,
  WaveformPoint,
  WaveformPreviewData,
  WaveformTrace,
} from "./types";

export interface LiveWaveformOverlayState {
  peakHoldPoints: WaveformPoint[];
  recentFrames: WaveformPoint[][];
}

export function createLiveWaveformOverlayState(): LiveWaveformOverlayState {
  return {
    peakHoldPoints: [],
    recentFrames: [],
  };
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

function buildAveragePoints(frames: WaveformPoint[][]): WaveformPoint[] {
  if (frames.length === 0) {
    return [];
  }

  const pointCount = frames[0].length;
  const result: WaveformPoint[] = [];
  for (let index = 0; index < pointCount; index += 1) {
    let sum = 0;
    let count = 0;
    for (const frame of frames) {
      if (frame.length <= index) {
        continue;
      }
      sum += frame[index].y;
      count += 1;
    }
    const x = frames[0][index].x;
    result.push({ x, y: count > 0 ? sum / count : 0 });
  }
  return result;
}

function isCompatible(points: WaveformPoint[], candidate: WaveformPoint[]): boolean {
  if (points.length !== candidate.length) {
    return false;
  }
  for (let index = 0; index < points.length; index += 1) {
    if (Math.abs(points[index].x - candidate[index].x) > 1e-9) {
      return false;
    }
  }
  return true;
}

function upsertTrace(traces: WaveformTrace[], trace: WaveformTrace): WaveformTrace[] {
  const index = traces.findIndex((item) => item.id === trace.id);
  if (index < 0) {
    return [...traces, trace];
  }

  const next = [...traces];
  next[index] = trace;
  return next;
}

function mean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sum = values.reduce((acc, value) => acc + value, 0);
  return sum / values.length;
}

function stdDev(values: number[], valueMean: number): number {
  if (values.length < 2) {
    return 0;
  }
  const variance = values.reduce((acc, value) => {
    const delta = value - valueMean;
    return acc + delta * delta;
  }, 0) / values.length;
  return Math.sqrt(Math.max(0, variance));
}

function nextLevel(current: LiveStatsLevel, candidate: LiveStatsLevel): LiveStatsLevel {
  const rank: Record<LiveStatsLevel, number> = {
    normal: 0,
    warning: 1,
    critical: 2,
  };
  return rank[candidate] > rank[current] ? candidate : current;
}

function buildLiveStats(frames: WaveformPoint[][]): LiveWaveformStats {
  const values = frames.flatMap((frame) => frame.map((point) => point.y));
  if (values.length === 0) {
    return {
      peakToPeak: 0,
      mean: 0,
      stdDev: 0,
      coefficientOfVariation: 0,
      level: "normal",
      window: 0,
    };
  }

  const statMean = mean(values);
  const statStdDev = stdDev(values, statMean);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const peakToPeak = maxValue - minValue;
  const denominator = Math.max(Math.abs(statMean), 1e-9);
  const coefficientOfVariation = statStdDev / denominator;
  const peakToPeakRatio = peakToPeak / denominator;

  let level: LiveStatsLevel = "normal";
  if (coefficientOfVariation >= 0.12 || peakToPeakRatio >= 0.45) {
    level = nextLevel(level, "warning");
  }
  if (coefficientOfVariation >= 0.2 || peakToPeakRatio >= 0.8) {
    level = nextLevel(level, "critical");
  }

  return {
    peakToPeak,
    mean: statMean,
    stdDev: statStdDev,
    coefficientOfVariation,
    level,
    window: frames.length,
  };
}

export function applyLiveFrequencyOverlays(
  waveform: WaveformPreviewData,
  state: LiveWaveformOverlayState,
  recentFrameWindow = 6,
): { waveform: WaveformPreviewData; state: LiveWaveformOverlayState } {
  if (waveform.frameType !== "frequency" || waveform.traces.length === 0) {
    return { waveform, state };
  }

  const primaryTrace = waveform.traces[0];
  if (primaryTrace.points.length < 2) {
    return { waveform, state };
  }

  let nextPeak = state.peakHoldPoints;
  let nextRecent = state.recentFrames;

  if (!isCompatible(nextPeak, primaryTrace.points)) {
    nextPeak = primaryTrace.points.map((point) => ({ x: point.x, y: point.y }));
    nextRecent = [];
  }

  const updatedPeak = nextPeak.map((point, index) => ({
    x: point.x,
    y: Math.max(point.y, primaryTrace.points[index].y),
  }));

  const currentFrame = primaryTrace.points.map((point) => ({ x: point.x, y: point.y }));
  const updatedRecent = [...nextRecent, currentFrame].slice(-Math.max(2, recentFrameWindow));
  const averagePoints = buildAveragePoints(updatedRecent);
  const liveStats = buildLiveStats(updatedRecent);

  const peakTrace: WaveformTrace = {
    id: "livePeakHold",
    label: "live peak hold",
    color: "#ff8c00",
    points: updatedPeak,
    markers: buildMarkers(updatedPeak),
  };

  const averageTrace: WaveformTrace = {
    id: "liveRecentAvg",
    label: `live avg(${updatedRecent.length})`,
    color: "#9cdcfe",
    points: averagePoints,
    markers: buildMarkers(averagePoints),
  };

  let traces = waveform.traces;
  traces = upsertTrace(traces, peakTrace);
  traces = upsertTrace(traces, averageTrace);

  const currentVisible = waveform.visibleTraceIds.length > 0
    ? waveform.visibleTraceIds
    : waveform.traces.map((trace) => trace.id);
  const preservePeakVisibility = currentVisible.includes("livePeakHold");
  const visibleTraceIds = Array.from(
    new Set([
      ...currentVisible,
      "liveRecentAvg",
      ...(preservePeakVisibility ? ["livePeakHold"] : []),
    ]),
  );

  return {
    waveform: {
      ...waveform,
      traces,
      visibleTraceIds,
      liveStats,
    },
    state: {
      peakHoldPoints: updatedPeak,
      recentFrames: updatedRecent,
    },
  };
}
