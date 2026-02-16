import { strict as assert } from "node:assert";
import { buildUnifiedControlCenterHtml } from "../src/unifiedControlCenter";

(() => {
  const fakeWebview = {
    cspSource: "vscode-webview://test",
  } as unknown as { cspSource: string };

  const html = buildUnifiedControlCenterHtml(fakeWebview as never, "nonce-test");

  assert(html.includes("XSWL VNA Control Center"));
  assert(html.includes("Stimulus"));
  assert(html.includes("Response"));
  assert(html.includes("Calibration"));
  assert(html.includes("Trigger"));
  assert(html.includes("Analysis"));
  // New Setup Layout assertions
  assert(html.includes('data-target="stim"'));
  assert(html.includes('id="page-stim"'));
  assert(html.includes("data-target=\"stim\"")); 
  assert(html.includes("sp-item-title"));
  // End New Setup Layout assertions
  assert(html.includes("data-action=\"setup-placeholder\""));
  // REMOVED sidebarTabChannels assertions
  assert(html.includes("workspaceStatusBtn"));
  assert(html.includes("topbarWorkspaceBtn"));
  assert(html.includes("id=\"modal\""));
  assert(html.includes("openModal("));
  assert(html.includes("closeModal("));
  assert(html.includes("workspace-save"));
  assert(html.includes("workspace-activate"));
  assert(html.includes("scan-set"));
  assert(html.includes("waveform-live-start"));
  assert(html.includes("waveform-live-stop"));
  assert(html.includes("topologyVisualMode"));
  assert(html.includes("topologyYamlMode"));
  assert(html.includes("topologyCanvasContainer"));
  assert(html.includes("deviceManagerRows"));
  assert(html.includes("data-action=\"delete-vp\""));
  assert(html.includes("board-port-slot"));
  assert(html.includes("open-visual-topology"));
  assert(html.includes("<canvas id=\"waveCanvas\"></canvas>"));
})();
