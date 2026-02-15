import { strict as assert } from "node:assert";
import { buildUnifiedControlCenterHtml } from "../src/unifiedControlCenter";

(() => {
  const fakeWebview = {
    cspSource: "vscode-webview://test",
  } as unknown as { cspSource: string };

  const html = buildUnifiedControlCenterHtml(fakeWebview as never, "nonce-test");

  assert(html.includes("XSWL VNA Control Center"));
  assert(html.includes("工作区管理"));
  assert(html.includes("拓扑管理"));
  assert(html.includes("扫描控制"));
  assert(html.includes("data-menu-toggle=\"workspace\""));
  assert(html.includes("data-menu-toggle=\"topology\""));
  assert(html.includes("data-menu-toggle=\"scan\""));
  assert(html.includes("id=\"modal\""));
  assert(html.includes("openModal("));
  assert(html.includes("closeModal("));
  assert(html.includes("workspace-save"));
  assert(html.includes("workspace-activate"));
  assert(html.includes("scan-set"));
  assert(html.includes("waveform-live-start"));
  assert(html.includes("waveform-live-stop"));
  assert(html.includes("open-visual-topology"));
  assert(html.includes("<canvas id=\"waveCanvas\"></canvas>"));
})();
