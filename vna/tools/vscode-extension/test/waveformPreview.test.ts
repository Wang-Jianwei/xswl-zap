import { strict as assert } from "node:assert";
import { buildWaveformPreviewData, buildWaveformPreviewHtml } from "../src/waveformPreview";

(() => {
  const frequencyPayload = {
    instanceId: "inst0",
    timestampNs: 123,
    frequencyFrame: {
      points: [
        { frequencyHz: 1.0e9, real: 3, imag: 4 },
        { frequencyHz: 1.1e9, real: 0, imag: 2 },
      ],
    },
    receiverRawPoints: [
      {
        frequencyHz: 1.0e9,
        channels: [{ real: 1, imag: 0 }],
      },
      {
        frequencyHz: 1.1e9,
        channels: [{ real: 0, imag: 1 }],
      },
    ],
    receiverCompensatedPoints: [
      {
        frequencyHz: 1.0e9,
        channels: [{ real: 2, imag: 0 }],
      },
      {
        frequencyHz: 1.1e9,
        channels: [{ real: 0, imag: 2 }],
      },
    ],
    sParameterPoints: [
      {
        frequencyHz: 1.0e9,
        points: [
          { rowPort: 1, colPort: 1, real: 3, imag: 4 },
          { rowPort: 1, colPort: 2, real: 0, imag: 0 },
        ],
      },
      {
        frequencyHz: 1.1e9,
        points: [
          { rowPort: 1, colPort: 1, real: 0, imag: 5 },
          { rowPort: 1, colPort: 2, real: 0, imag: 0 },
        ],
      },
    ],
  } as Record<string, unknown>;

  const frequencyData = buildWaveformPreviewData(frequencyPayload);
  assert.equal(frequencyData.frameType, "frequency");
  assert.equal(frequencyData.xLabel, "frequency_hz");
  assert.equal(frequencyData.points.length, 2);
  assert.equal(frequencyData.points[0].y, 5);
  assert.equal(frequencyData.markers.length, 2);
  assert.equal(frequencyData.traces.length, 1);

  const allTraceData = buildWaveformPreviewData(frequencyPayload, "all");
  assert.equal(allTraceData.traces.length, 4);
  assert.equal(allTraceData.traceSource, "all");
  assert(buildWaveformPreviewHtml(allTraceData).includes("legend="));

  const s11Data = buildWaveformPreviewData(frequencyPayload, "sParameterS11");
  assert.equal(s11Data.traces.length, 1);
  assert.equal(s11Data.traces[0].id, "s11");

  const singlePointPayload = {
    instanceId: "inst-single",
    timestampNs: 1,
    frequencyFrame: {
      points: [{ frequencyHz: 1.0e9, real: 0, imag: 0 }],
    },
  } as Record<string, unknown>;
  const singlePointData = buildWaveformPreviewData(singlePointPayload);
  assert.equal(singlePointData.points.length, 1);
  assert(buildWaveformPreviewHtml(singlePointData).includes("<circle"));

  const html = buildWaveformPreviewHtml(frequencyData);
  assert(html.includes("instance=inst0"));
  assert(html.includes("polyline"));
  assert(html.includes("markers=frame["));
  assert(html.includes("axis-line"));

  const timePayload = {
    instanceId: "inst1",
    timestampNs: 999,
    timeFrame: {
      points: [
        { timeNs: 0, magnitude: 0.1 },
        { timeNs: 1, magnitude: 0.4 },
      ],
    },
  } as Record<string, unknown>;
  const timeData = buildWaveformPreviewData(timePayload);
  assert.equal(timeData.frameType, "time");
  assert.equal(timeData.xLabel, "time_ns");
  assert.equal(timeData.points.length, 2);

  const emptyData = buildWaveformPreviewData({ instanceId: "x" } as Record<string, unknown>);
  assert.equal(emptyData.frameType, "unknown");
  assert.equal(emptyData.points.length, 0);
  assert(buildWaveformPreviewHtml(emptyData).includes("No waveform points available"));

  const densePayload = {
    instanceId: "dense",
    timestampNs: 1,
    frequencyFrame: {
      points: Array.from({ length: 1000 }, (_, idx) => ({
        frequencyHz: 1.0e9 + idx,
        real: idx,
        imag: 0,
      })),
    },
  } as Record<string, unknown>;
  const denseData = buildWaveformPreviewData(densePayload);
  assert.equal(denseData.points.length, 512);

  process.stdout.write("waveformPreview.test passed\n");
})();
