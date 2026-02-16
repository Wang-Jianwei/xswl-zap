import { strict as assert } from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";

(() => {
  const packageJsonPath = path.resolve(__dirname, "..", "..", "package.json");
  const raw = fs.readFileSync(packageJsonPath, "utf8");
  const manifest = JSON.parse(raw) as {
    contributes?: {
      viewsContainers?: {
        activitybar?: Array<{ id?: string }>;
      };
      views?: Record<string, Array<{ id?: string; type?: string }>>;
      commands?: Array<{ command?: string }>;
      menus?: {
        "view/title"?: Array<{ command?: string; when?: string }>;
      };
    };
  };

  const container = manifest.contributes?.viewsContainers?.activitybar?.find((item) => item.id === "xswlZapVna");
  assert(container, "Expected activity bar container xswlZapVna");

  const controlCenterView = manifest.contributes?.views?.xswlZapVna?.find((item) => item.id === "xswlZapVna.controlCenterView");
  assert(controlCenterView, "Expected control center sidebar view contribution");
  assert.equal(controlCenterView?.type, "webview");

  const openCommand = manifest.contributes?.commands?.find((item) => item.command === "xswlZapVna.openControlCenter");
  const maximizeCommand = manifest.contributes?.commands?.find((item) => item.command === "xswlZapVna.openControlCenterMaximized");
  assert(openCommand, "Expected openControlCenter command");
  assert(maximizeCommand, "Expected openControlCenterMaximized command");

  const titleMenu = manifest.contributes?.menus?.["view/title"] ?? [];
  const maximizeEntry = titleMenu.find(
    (item) => item.command === "xswlZapVna.openControlCenterMaximized" && item.when === "view == xswlZapVna.controlCenterView",
  );
  assert(maximizeEntry, "Expected maximize action in view/title menu");
})();
