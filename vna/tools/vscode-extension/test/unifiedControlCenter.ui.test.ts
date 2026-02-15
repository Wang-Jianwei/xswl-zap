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

    const initialDeviceRows = await page.locator("#deviceManagerRows .device-row").count();
    await page.locator("#btnAddDevice").click();
    await page.waitForTimeout(40);
    const nextDeviceRows = await page.locator("#deviceManagerRows .device-row").count();
    assert.equal(nextDeviceRows, initialDeviceRows + 1, "device manager add button did not create device row");

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

    const firstBoardPortLabel = ((await page.locator('.t-node[data-type="board"] .t-port-label').first().textContent()) ?? "").trim();
    assert.equal(firstBoardPortLabel, "1", "board port label should simplify p1 -> 1");

    // Test expand board details (use the LAST/newest board to avoid overlap issues)
    const expandBtn = page.locator('.t-node[data-type="board"] [data-action="toggle-expand"]').last();
    // Scroll into view
    await expandBtn.scrollIntoViewIfNeeded();
    
    const initialIcon = await expandBtn.textContent();
    assert.equal(initialIcon?.trim(), "▶", "initial expand icon should be ▶");

    const boardLabel = page.locator('.t-node[data-type="board"] [data-action="toggle-expand-label"]').last();
    await boardLabel.dblclick({ force: true });
    await page.waitForTimeout(80);
    const iconAfterDblClick = await expandBtn.textContent();
    assert.equal(iconAfterDblClick?.trim(), "▼", "double click board label should expand board details");

    await boardLabel.dblclick({ force: true });
    await page.waitForTimeout(80);
    const iconAfterSecondDblClick = await expandBtn.textContent();
    assert.equal(iconAfterSecondDblClick?.trim(), "▶", "double click board label again should collapse board details");
    
    await expandBtn.click({ force: true });
    await page.waitForTimeout(100); // Increase wait time
    const expandedIcon = await expandBtn.textContent();
    assert.equal(expandedIcon?.trim(), "▼", "expanded icon should be ▼");

    const boardTemplateSelect = page.locator('.t-node[data-type="board"] [data-action="board-device-template"]').last();
    await boardTemplateSelect.selectOption("dev-pxi-0");
    await page.waitForTimeout(40);

    const boardBindHint = page.locator('.t-node[data-type="board"] .board-bind-hint').last();
    const bindState = await boardBindHint.getAttribute("data-bind-state");
    const bindTemplateId = await boardBindHint.getAttribute("data-template-id");
    assert.equal(bindState, "bound", "board should show bound state after selecting template");
    assert.equal(bindTemplateId, "dev-pxi-0", "board should display selected template id in bind hint");

    const pxiResourceInput = page.locator('#deviceManagerRows .device-row[data-device-id="dev-pxi-0"] input[data-field="resource"]').first();
    await pxiResourceInput.fill("dev0-bound-updated");
    await page.waitForTimeout(60);

    const boardResourceInput = page.locator('.t-node[data-type="board"] [data-action="board-resource"]').last();
    const boundResourceValue = await boardResourceInput.inputValue();
    assert.equal(boundResourceValue, "dev0-bound-updated", "editing device manager resource should sync to bound board resource");

    await boardResourceInput.fill("virt://custom/resource-1");
    await page.waitForTimeout(40);
    const boardResourceValue = await boardResourceInput.inputValue();
    assert.equal(boardResourceValue, "virt://custom/resource-1", "board resource should be editable in expanded details");

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
