import { strict as assert } from "node:assert";
import { existsSync } from "node:fs";
import { Script } from "node:vm";
import { chromium } from "playwright-core";
import { buildUnifiedControlCenterHtml } from "../src/unifiedControlCenter";

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

(() => {
  const html = buildUnifiedControlCenterHtml({ cspSource: "vscode-webview://test" } as never, "nonce-test");
  const scriptMatch = html.match(/<script nonce="[^"]*">([\s\S]*?)<\/script>/);
  const scriptSection = scriptMatch?.[1] ?? "";
  assert(scriptSection.length > 0, "missing inline webview script");
  new Script(scriptSection, { filename: "unified_control_center_inline.js" });
})();

(async () => {
  const executablePath = resolveBrowserExecutable();
  const browser = await chromium.launch({
    headless: true,
    executablePath,
    args: ["--disable-gpu", "--no-sandbox"],
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(`${error.message} :: ${error.stack ?? "no-stack"}`);
    });

    const htmlRaw = buildUnifiedControlCenterHtml({ cspSource: "vscode-webview://test" } as never, "nonce-test");
    const html = htmlRaw.replace(
      '<script nonce="nonce-test">',
      '<script nonce="nonce-test">window.__postedMessages = []; function acquireVsCodeApi(){ return { postMessage: function(message){ window.__postedMessages.push(message); } }; }</script><script nonce="nonce-test">',
    );
    await page.setContent(html, { waitUntil: "load" });
    await page.waitForTimeout(80);

    assert.equal(pageErrors.length, 0, `webview page bootstrap errors: ${pageErrors.join(" | ")}`);

    await page.locator('[data-menu-toggle="topology"]').click();
    await page.locator('[data-view="topology"]').click();
    await page.waitForTimeout(40);
    const topologyViewClass = (await page.locator("#view-topology").getAttribute("class")) ?? "";
    assert(topologyViewClass.includes("is-active"), "topology view did not activate on click");

    // Test adding virtual port via Modal
    await page.locator("#btnAddVirtualPort").click();
    await page.waitForTimeout(40);
    const modalInput = await page.inputValue("#modalInput");
    assert(modalInput.includes("vna-port"), "modal input should have default value");
    await page.fill("#modalInput", "vna-test-port");
    await page.locator("#modalConfirm").click();
    await page.waitForTimeout(40);
    
    // Check if node exists in canvas
    const hasNewVirtualPort = await page.locator(".t-node.virtual", { hasText: "vna-test-port" }).count();
    assert(hasNewVirtualPort > 0, "add virtual port (via modal) did not create node");

    // Test adding board
    await page.locator("#btnAddBoard").click();
    await page.waitForTimeout(40);
    const boardCount = await page.locator(".t-node[data-type='board']").count();
    assert(boardCount >= 2, "add board button did not create board node");

    // Auto layout check (simple click check)
    await page.locator("#btnAutoLayout").click();
    await page.waitForTimeout(40);

    await page.locator('[data-action="open-new-workspace-modal"]').click();
    await page.waitForTimeout(40);
    const modalClass = (await page.locator("#modal").getAttribute("class")) ?? "";
    assert(modalClass.includes("is-open"), "new workspace modal did not open");

    await page.fill("#modalInput", "ws-ui");
    await page.locator("#modalConfirm").click();
    await page.waitForTimeout(40);
    const workspaceValue = await page.inputValue("#workspaceId");
    assert.equal(workspaceValue, "ws-ui", "modal confirm did not write workspace id");

    await page.evaluate(() => {
      const doc = (globalThis as unknown as {
        document?: { querySelector: (selector: string) => { classList: { add: (name: string) => void } } | null };
      }).document;
      const group = doc?.querySelector('.menu-group[data-group="workspace"]');
      group?.classList.add("is-open");
    });
    await page.locator('[data-view="workspace"]').click();
    await page.locator("#btnWorkspaceLoad").click();
    await page.waitForTimeout(40);
    const hasWorkspaceLoadPost = await page.evaluate(() => {
      const global = globalThis as unknown as { __postedMessages?: Array<{ type?: string }> };
      return Array.isArray(global.__postedMessages)
        ? global.__postedMessages.some((item) => String(item?.type ?? "") === "workspace-load")
        : false;
    });
    assert.equal(hasWorkspaceLoadPost, true, "workspace load button did not post message");

    assert.equal(pageErrors.length, 0, `webview page errors: ${pageErrors.join(" | ")}`);
    process.stdout.write("unifiedControlCenter.ui.test passed\n");
  } finally {
    await browser.close();
  }
})();
