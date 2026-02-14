import { strict as assert } from "node:assert";
import { applyLiveFrequencyOverlays, createLiveWaveformOverlayState } from "../src/liveWaveformOverlay";
import type { WaveformPreviewData } from "../src/types";

function buildFrame(y0: number, y1: number): WaveformPreviewData {
  return {
    instanceId: "inst0",
    timestampNs: 1,
    frameType: "frequency",
    xLabel: "frequency_hz",
    yLabel: "magnitude",
    traceSource: "frame",
    channelIndex: 0,
    visibleTraceIds: ["frame"],
    traces: [
      {
        id: "frame",
        label: "frame",
        color: "#4ec9b0",
        points: [
          { x: 1.0e9, y: y0 },
          { x: 1.1e9, y: y1 },
        ],
        markers: [],
      },
    ],
    points: [
      { x: 1.0e9, y: y0 },
      { x: 1.1e9, y: y1 },
    ],
    markers: [],
  };
}

(() => {
  let state = createLiveWaveformOverlayState();

  const pass1 = applyLiveFrequencyOverlays(buildFrame(1, 2), state, 4);
  state = pass1.state;
  const peak1 = pass1.waveform.traces.find((trace) => trace.id === "livePeakHold");
  const avg1 = pass1.waveform.traces.find((trace) => trace.id === "liveRecentAvg");
  assert(peak1);
  assert(avg1);
  assert.equal(peak1.points[0].y, 1);
  assert.equal(peak1.points[1].y, 2);
  assert.equal(avg1.points[0].y, 1);

  const pass2 = applyLiveFrequencyOverlays(buildFrame(3, 1), state, 4);
  state = pass2.state;
  const peak2 = pass2.waveform.traces.find((trace) => trace.id === "livePeakHold");
  const avg2 = pass2.waveform.traces.find((trace) => trace.id === "liveRecentAvg");
  assert(peak2);
  assert(avg2);
  assert.equal(peak2.points[0].y, 3);
  assert.equal(peak2.points[1].y, 2);
  assert(Math.abs(avg2.points[0].y - 2) < 1e-9);
  assert(Math.abs(avg2.points[1].y - 1.5) < 1e-9);
  assert(pass2.waveform.liveStats);
  assert.equal(pass2.waveform.liveStats?.window, 2);
  assert(pass2.waveform.liveStats!.peakToPeak > 0);
  assert(pass2.waveform.liveStats!.stdDev > 0);
  assert.equal(pass2.waveform.liveStats?.level, "critical");

  assert(pass2.waveform.visibleTraceIds.includes("liveRecentAvg"));
  assert(!pass2.waveform.visibleTraceIds.includes("livePeakHold"));

  const freshState = createLiveWaveformOverlayState();
  const baseFrame = buildFrame(2, 4);
  const passDefault = applyLiveFrequencyOverlays(
    {
      ...baseFrame,
      visibleTraceIds: ["frame"],
    },
    freshState,
    4,
  );
  assert(passDefault.waveform.visibleTraceIds.includes("liveRecentAvg"));
  assert(!passDefault.waveform.visibleTraceIds.includes("livePeakHold"));
  assert(passDefault.waveform.liveStats);

  const passOptInPeak = applyLiveFrequencyOverlays(
    {
      ...buildFrame(5, 6),
      visibleTraceIds: ["frame", "livePeakHold"],
    },
    passDefault.state,
    4,
  );
  assert(passOptInPeak.waveform.visibleTraceIds.includes("livePeakHold"));

  process.stdout.write("liveWaveformOverlay.test passed\n");
})();
