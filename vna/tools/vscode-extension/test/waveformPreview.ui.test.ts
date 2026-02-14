import { strict as assert } from "node:assert";
import { existsSync } from "node:fs";
import { Script } from "node:vm";
import { chromium } from "playwright-core";
import { buildWaveformPreviewData, buildWaveformPreviewHtml } from "../src/waveformPreview";

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

(async () => {
  const payload = {
    instanceId: "inst-ui",
    timestampNs: 123456,
    frequencyFrame: {
      points: [
        { frequencyHz: 1.0e9, real: 1, imag: 0 },
        { frequencyHz: 1.05e9, real: 2, imag: 1 },
        { frequencyHz: 1.1e9, real: 0.5, imag: 0.2 },
      ],
    },
    sParameterPoints: [
      {
        frequencyHz: 1.0e9,
        points: [{ rowPort: 1, colPort: 1, real: 0.6, imag: 0.1 }],
      },
      {
        frequencyHz: 1.05e9,
        points: [{ rowPort: 1, colPort: 1, real: 0.8, imag: 0.2 }],
      },
      {
        frequencyHz: 1.1e9,
        points: [{ rowPort: 1, colPort: 1, real: 0.4, imag: 0.05 }],
      },
    ],
  } as Record<string, unknown>;

  const previewData = buildWaveformPreviewData(payload, "all", 0, ["frame", "s11"]);
  const html = buildWaveformPreviewHtml(previewData);
  const scriptSection = html.split("<script>")[1]?.split("</script>")[0] ?? "";
  assert(scriptSection.length > 0, "missing inline webview script");
  try {
    new Script(scriptSection, { filename: "waveform_webview_inline.js" });
  } catch (error) {
    const message = error instanceof Error ? `${error.message}\n${error.stack ?? ""}` : String(error);
    throw new Error(`inline script syntax check failed: ${message}`);
  }

  const executablePath = resolveBrowserExecutable();
  const browser = await chromium.launch({
    headless: true,
    executablePath,
    args: ["--disable-gpu", "--no-sandbox"],
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(`${error.message} :: ${error.stack ?? "no-stack"}`);
    });

    await page.setContent(html, { waitUntil: "load" });
    await page.waitForTimeout(600);

    const scriptStatus = (await page.textContent("#scriptStatus")) ?? "";
    if (!scriptStatus.includes("script=ready")) {
      assert.equal(pageErrors.length, 0, `script not ready and page has errors: ${pageErrors.join(" | ")}`);
    }
    assert(scriptStatus.includes("script=ready"), `unexpected script status: ${scriptStatus}`);

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
    assert(
      drawStats.uniquePixelCount > 1,
      `canvas appears blank: uniquePixelCount=${drawStats.uniquePixelCount}`,
    );

    const toggleRenderMode = page.locator("#toggleRenderMode");
    await toggleRenderMode.click();
    await page.waitForTimeout(50);
    const renderModeText = (await toggleRenderMode.textContent()) ?? "";
    assert(renderModeText.includes("Mode: Raw"));

    const toggleEnvelope = page.locator("#toggleEnvelope");
    await toggleEnvelope.click();
    const envelopeClass = (await toggleEnvelope.getAttribute("class")) ?? "";
    assert(envelopeClass.includes("is-hidden"));

    const s11Legend = page.locator('.legend-item[data-trace-id="s11"]');
    await s11Legend.click();
    const s11Class = (await s11Legend.getAttribute("class")) ?? "";
    assert(s11Class.includes("is-hidden"));

    const scanHold = page.locator("#scanHold");
    const scanContinuous = page.locator("#scanContinuous");
    const scanStatus = page.locator("#scanStatus");
    await scanHold.click();
    await page.waitForTimeout(30);

    await page.evaluate(() => {
      const global = globalThis as unknown as { postMessage: (message: unknown) => void };
      global.postMessage({
        type: "waveform-update",
        payload: {
          scanState: "hold",
          scanStatusClass: "scan-status is-hold",
          scanStatusText: "scan=hold | stream=running | frames=7",
          canvasModel: {
            width: 900,
            height: 360,
            bounds: { minX: 1, maxX: 2, minY: 0, maxY: 3 },
            enableSmoothing: true,
            enableEnvelope: true,
            traces: [],
          },
        },
      });
    });
    await page.waitForTimeout(30);
    const holdText = (await scanStatus.textContent()) ?? "";
    assert(holdText.includes("scan=hold"));

    await scanContinuous.click();
    await page.evaluate(() => {
      const global = globalThis as unknown as { postMessage: (message: unknown) => void };
      global.postMessage({
        type: "waveform-update",
        payload: {
          scanState: "continuous",
          scanStatusClass: "scan-status is-continuous",
          scanStatusText: "scan=continuous | stream=running | frames=8",
          canvasModel: {
            width: 900,
            height: 360,
            bounds: { minX: 1, maxX: 2, minY: 0, maxY: 3 },
            enableSmoothing: true,
            enableEnvelope: true,
            traces: [],
          },
        },
      });
    });
    await page.waitForTimeout(30);
    const continueText = (await scanStatus.textContent()) ?? "";
    assert(continueText.includes("scan=continuous"));
    assert(continueText.includes("frames=8"));

    assert.equal(pageErrors.length, 0, `webview page errors: ${pageErrors.join(" | ")}`);

    process.stdout.write("waveformPreview.ui.test passed\n");
  } finally {
    await browser.close();
  }
})();
