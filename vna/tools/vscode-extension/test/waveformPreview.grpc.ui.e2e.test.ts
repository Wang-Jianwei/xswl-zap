import { strict as assert } from "node:assert";
import { existsSync } from "node:fs";
import { chromium } from "playwright-core";
import type { Page } from "playwright-core";
import { ServiceClient } from "../src/serviceClient";
import type { WaveformPreviewData, WaveformScanState } from "../src/types";
import { buildWaveformPreviewHtml, buildWaveformPreviewUpdatePayload } from "../src/waveformPreview";

const kDefaultGrpcAddress = "127.0.0.1:50051";
const kDefaultDeadlineMs = 3000;
const kDefaultInstanceId = "inst0";
const kDefaultSampleCount = 128;

function resolveBrowserExecutable(): string {
  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  ].filter((item): item is string => typeof item === "string" && item.length > 0);

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error("No Chromium executable found. Set PLAYWRIGHT_CHROMIUM_EXECUTABLE or install Edge/Chrome.");
}

function parseEnvInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.trunc(parsed);
  }
  return fallback;
}

function withScanState(
  waveform: WaveformPreviewData,
  scanState: WaveformScanState,
  streamActive: boolean,
  streamFrameCount: number,
): WaveformPreviewData {
  return {
    ...waveform,
    scanState,
    streamActive,
    streamFrameCount,
  };
}

async function postWaveformUpdate(page: Page, data: WaveformPreviewData): Promise<void> {
  const payload = buildWaveformPreviewUpdatePayload(data);
  await page.evaluate((updatePayload) => {
    const global = globalThis as unknown as { postMessage: (message: unknown) => void };
    global.postMessage({ type: "waveform-update", payload: updatePayload });
  }, payload);
}

(async () => {
  const grpcAddress = process.env.VNA_GRPC_ADDRESS ?? kDefaultGrpcAddress;
  const deadlineMs = parseEnvInt(process.env.VNA_GRPC_DEADLINE_MS, kDefaultDeadlineMs);
  const instanceId = process.env.VNA_UI_E2E_INSTANCE_ID ?? kDefaultInstanceId;
  const sampleCount = parseEnvInt(process.env.VNA_UI_E2E_SAMPLE_COUNT, kDefaultSampleCount);

  const client = new ServiceClient({ address: grpcAddress, deadlineMs });
  const executablePath = resolveBrowserExecutable();
  const browser = await chromium.launch({
    headless: true,
    executablePath,
    args: ["--disable-gpu", "--no-sandbox"],
  });

  try {
    const status = await client.getServiceStatus();
    assert(status.ready, `grpc service is not ready: state=${status.state}, message=${status.message}`);

    const initialState = await client.setScanState(instanceId, "continuous");
    const initialWaveform = await client.acquireWaveform(
      instanceId,
      sampleCount,
      "frequency",
      "all",
      0,
      ["frame", "s11"],
    );

    let frameCount = 0;
    let latestWaveform = initialWaveform;
    const html = buildWaveformPreviewHtml(
      withScanState(initialWaveform, initialState.scanState, initialState.streamActive, frameCount),
    );

    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(`${error.message} :: ${error.stack ?? "no-stack"}`);
    });

    await page.setContent(html, { waitUntil: "load" });
    await page.waitForTimeout(600);

    const scriptStatus = (await page.textContent("#scriptStatus")) ?? "";
    assert(scriptStatus.includes("script=ready"), `unexpected script status: ${scriptStatus}`);

    const frameUpdateTasks: Promise<void>[] = [];
    await client.streamWaveform(
      instanceId,
      sampleCount,
      "frequency",
      "all",
      0,
      ["frame", "s11"],
      3,
      (waveform, count) => {
        frameCount = count;
        latestWaveform = waveform;
        const statefulWaveform = withScanState(waveform, "continuous", true, count);
        frameUpdateTasks.push(postWaveformUpdate(page, statefulWaveform));
      },
    );

    await Promise.all(frameUpdateTasks);
    assert(frameCount >= 1, "expected at least one grpc stream frame");
    await page.waitForTimeout(80);

    const drawStats = await page.evaluate(() => {
      const documentAny = (globalThis as { document?: { getElementById: (id: string) => unknown } }).document;
      const canvas = documentAny?.getElementById("waveCanvas") as {
        width?: number;
        height?: number;
        getContext?: (type: string) => { getImageData: (x: number, y: number, w: number, h: number) => { data: Uint8ClampedArray } } | null;
      } | null;
      if (!canvas || typeof canvas.getContext !== "function" || typeof canvas.width !== "number" || typeof canvas.height !== "number") {
        return { hasCanvas: false, uniquePixelCount: 0 };
      }

      const context = canvas.getContext("2d");
      if (!context) {
        return { hasCanvas: true, uniquePixelCount: 0 };
      }

      const image = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const sampleStride = Math.max(4, Math.floor(image.length / 12000));
      const sampled = new Set<string>();
      for (let index = 0; index < image.length; index += sampleStride) {
        const r = image[index] ?? 0;
        const g = image[index + 1] ?? 0;
        const b = image[index + 2] ?? 0;
        const a = image[index + 3] ?? 0;
        sampled.add(`${r},${g},${b},${a}`);
      }

      return { hasCanvas: true, uniquePixelCount: sampled.size };
    });

    assert.equal(drawStats.hasCanvas, true);
    assert(drawStats.uniquePixelCount > 1, `canvas appears blank: uniquePixelCount=${drawStats.uniquePixelCount}`);

    const scanStatus = page.locator("#scanStatus");
    const runningText = (await scanStatus.textContent()) ?? "";
    assert(runningText.includes("scan=continuous"));

    const scanHold = page.locator("#scanHold");
    await scanHold.click();
    const holdState = await client.setScanState(instanceId, "hold");
    await postWaveformUpdate(page, withScanState(latestWaveform, holdState.scanState, holdState.streamActive, frameCount));
    await page.waitForTimeout(60);
    const holdText = (await scanStatus.textContent()) ?? "";
    assert(holdText.includes("scan=hold"));

    const scanContinuous = page.locator("#scanContinuous");
    await scanContinuous.click();
    const continuousState = await client.setScanState(instanceId, "continuous");
    const resumedWaveform = await client.streamWaveform(
      instanceId,
      sampleCount,
      "frequency",
      "all",
      0,
      ["frame", "s11"],
      1,
    );
    frameCount += 1;
    await postWaveformUpdate(page, withScanState(resumedWaveform, continuousState.scanState, continuousState.streamActive, frameCount));
    await page.waitForTimeout(60);

    const continueText = (await scanStatus.textContent()) ?? "";
    assert(continueText.includes("scan=continuous"));
    assert.equal(pageErrors.length, 0, `webview page errors: ${pageErrors.join(" | ")}`);

    process.stdout.write("waveformPreview.grpc.ui.e2e.test passed\n");
  } finally {
    try {
      await client.setScanState(instanceId, "hold");
    } catch {
    }
    client.dispose();
    await browser.close();
  }
})();