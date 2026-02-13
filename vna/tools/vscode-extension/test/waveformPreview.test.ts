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
  assert.equal(frequencyData.points.length, 2);
  assert.equal(frequencyData.points[0].y, 5);

  const html = buildWaveformPreviewHtml(frequencyData);
  assert(html.includes("instance=inst0"));
  assert(html.includes("polyline"));

  const emptyData = buildWaveformPreviewData({ instanceId: "x" } as Record<string, unknown>);
  assert.equal(emptyData.frameType, "unknown");
  assert.equal(emptyData.points.length, 0);
  assert(buildWaveformPreviewHtml(emptyData).includes("No waveform points available"));

  process.stdout.write("waveformPreview.test passed\n");
})();
