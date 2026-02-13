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
  } as Record<string, unknown>;

  const frequencyData = buildWaveformPreviewData(frequencyPayload);
  assert.equal(frequencyData.frameType, "frequency");
  assert.equal(frequencyData.xLabel, "frequency_hz");
  assert.equal(frequencyData.points.length, 2);
  assert.equal(frequencyData.points[0].y, 5);
  assert.equal(frequencyData.markers.length, 2);

  const html = buildWaveformPreviewHtml(frequencyData);
  assert(html.includes("instance=inst0"));
  assert(html.includes("polyline"));
  assert(html.includes("markers=min"));

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
