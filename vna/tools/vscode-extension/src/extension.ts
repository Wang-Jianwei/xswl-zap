import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import {
  formatAcquisitionSummary,
  formatBatchCompareImportedSummary,
  formatCompareImportedAcquisitionSummary,
  formatImportedAcquisitionSummary,
  formatInstanceCapabilities,
  formatServiceStatus,
  formatServiceStatusMultiline,
  formatStreamPreviewSummary,
  formatValidationResult,
} from "./statusFormatter";
import { ServiceClient } from "./serviceClient";
import { applyLiveFrequencyOverlays, createLiveWaveformOverlayState } from "./liveWaveformOverlay";
import { buildLockSnapshotSummary, collectConflictSelectors } from "./lockDiagnostics";
import { buildWaveformPreviewHtml, buildWaveformPreviewUpdatePayload } from "./waveformPreview";
import { buildWorkspaceTopologyEditorHtml } from "./workspaceTopologyEditor";
import { buildUnifiedControlCenterHtml } from "./unifiedControlCenter";
import type { WaveformPreviewData, WaveformScanState, WaveformTraceSource } from "./types";

type LogLevel = "INFO" | "ERROR";
let requestSequence = 0;

function readConfig(): { address: string; deadlineMs: number; autoOpenOutput: boolean } {
  const config = vscode.workspace.getConfiguration("xswlZapVna");
  const address = config.get<string>("grpcAddress", "127.0.0.1:50051");
  const deadlineMs = config.get<number>("grpcDeadlineMs", 2000);
  const autoOpenOutput = config.get<boolean>("autoOpenOutput", true);
  return { address, deadlineMs, autoOpenOutput };
}

function nowTimestamp(): string {
  return new Date().toISOString();
}

function createRequestId(): string {
  requestSequence += 1;
  return `${Date.now().toString(36)}-${requestSequence}`;
}

function createNonce(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let i = 0; i < 20; i += 1) {
    nonce += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return nonce;
}

function logLine(outputChannel: vscode.OutputChannel, level: LogLevel, message: string): void {
  outputChannel.appendLine(`[${nowTimestamp()}] [${level}] ${message}`);
}

function logBlock(outputChannel: vscode.OutputChannel, level: LogLevel, title: string, lines: string[]): void {
  logLine(outputChannel, level, title);
  for (const line of lines) {
    logLine(outputChannel, level, line);
  }
}

function showOutputIfEnabled(outputChannel: vscode.OutputChannel, autoOpenOutput: boolean): void {
  if (autoOpenOutput) {
    outputChannel.show(true);
  }
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

function extractRequiredResourcesFromTopologyYaml(topologyYaml: string): Array<{ type: number; resourceId: string }> {
  const resources = new Set<string>();
  const lines = topologyYaml.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*resource\s*:\s*(.+?)\s*$/);
    if (!match || !match[1]) {
      continue;
    }
    const resourceId = match[1].trim().replace(/^['"]|['"]$/g, "");
    if (resourceId.length > 0) {
      resources.add(resourceId);
    }
  }

  const lockResourceTypePhysicalDevice = 1;
  return Array.from(resources).map((resourceId) => ({
    type: lockResourceTypePhysicalDevice,
    resourceId,
  }));
}

function buildPrecheckFailureMessage(result: {
  code: string;
  message: string;
  topologyErrors: Array<{ message: string }>;
  lockConflicts: Array<{ selector: { resourceId: string }; holderOwner: { workspaceId: string; actor: string } }>;
}): string {
  const header = result.message || result.code || "precheck failed";
  const topologyError = result.topologyErrors[0]?.message;
  const firstConflict = result.lockConflicts[0];
  if (firstConflict) {
    const holderWorkspace = firstConflict.holderOwner.workspaceId || "unknown-workspace";
    const holderActor = firstConflict.holderOwner.actor || "unknown-actor";
    const resourceId = firstConflict.selector.resourceId || "unknown-resource";
    return `${header} (resource=${resourceId}, holder=${holderWorkspace}/${holderActor})`;
  }
  if (topologyError) {
    return `${header} (${topologyError})`;
  }
  return header;
}

function collectJsonFilesRecursively(rootDir: string): string[] {
  const results: string[] = [];
  const stack: string[] = [rootDir];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (entry.isFile() && entry.name.toLowerCase().endsWith(".json")) {
        results.push(fullPath);
      }
    }
  }

  results.sort((left, right) => left.localeCompare(right));
  return results;
}

interface BatchCompareCaseRecord {
  index: number;
  jsonPath: string;
  status: "matched" | "mismatched" | "failed";
  detail: string;
  grpcCompareToken: string;
  error: string;
}

interface BatchCompareReport {
  requestId: string;
  generatedAt: string;
  instanceId: string;
  scanDir: string;
  mode: "frequency" | "time";
  sampleCount: number;
  tolerance: number;
  summary: {
    total: number;
    matched: number;
    mismatched: number;
    failed: number;
  };
  cases: BatchCompareCaseRecord[];
}

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel("XSWL VNA");

  const openOutputCommand = vscode.commands.registerCommand("xswlZapVna.openOutput", async () => {
    outputChannel.show(true);
  });

  const clearOutputCommand = vscode.commands.registerCommand("xswlZapVna.clearOutput", async () => {
    outputChannel.clear();
    outputChannel.show(true);
  });

  const getServiceStatusCommand = vscode.commands.registerCommand("xswlZapVna.getServiceStatus", async () => {
    const requestId = createRequestId();
    const { address, deadlineMs, autoOpenOutput } = readConfig();
    const client = new ServiceClient({ address, deadlineMs });

    try {
      const status = await client.getServiceStatus();
      const compactMessage = formatServiceStatus(status);
      const multilineMessage = formatServiceStatusMultiline(status);

      outputChannel.clear();
      logBlock(outputChannel, "INFO", `[GetServiceStatus][requestId=${requestId}]`, multilineMessage.split("\n"));
      showOutputIfEnabled(outputChannel, autoOpenOutput);

      vscode.window.showInformationMessage(`VNA Service: ${compactMessage} | req=${requestId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logBlock(outputChannel, "ERROR", `[GetServiceStatus][requestId=${requestId}]`, [errorMessage]);
      showOutputIfEnabled(outputChannel, autoOpenOutput);
      vscode.window.showErrorMessage(`GetServiceStatus failed: ${errorMessage} | req=${requestId}`);
    } finally {
      client.dispose();
    }
  });

  const validateTopologyCommand = vscode.commands.registerCommand("xswlZapVna.validateTopology", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage("Open a topology YAML file before running Validate Topology.");
      return;
    }

    const topologyYaml = editor.document.getText().trim();
    if (topologyYaml.length === 0) {
      vscode.window.showWarningMessage("Current editor is empty. Please provide topology YAML content.");
      return;
    }

    const defaultId = editor.document.fileName.split(/[\\/]/).pop() ?? "topology-vscode";
    const topologyId = await vscode.window.showInputBox({
      prompt: "Topology ID",
      value: defaultId,
      ignoreFocusOut: true,
    });
    if (!topologyId) {
      return;
    }

    const requestId = createRequestId();
    const { address, deadlineMs, autoOpenOutput } = readConfig();
    const client = new ServiceClient({ address, deadlineMs });

    try {
      const result = await client.validateTopology(topologyId, topologyYaml);
      const message = formatValidationResult(result);

      logBlock(outputChannel, "INFO", `[ValidateTopology][requestId=${requestId}]`, [
        `topologyId=${topologyId}`,
        message,
      ]);
      showOutputIfEnabled(outputChannel, autoOpenOutput);

      if (result.ok) {
        vscode.window.showInformationMessage(`ValidateTopology: ${message} | req=${requestId}`);
      } else {
        vscode.window.showErrorMessage(`ValidateTopology: ${message} | req=${requestId}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logBlock(outputChannel, "ERROR", `[ValidateTopology][requestId=${requestId}]`, [errorMessage]);
      showOutputIfEnabled(outputChannel, autoOpenOutput);
      vscode.window.showErrorMessage(`ValidateTopology failed: ${errorMessage} | req=${requestId}`);
    } finally {
      client.dispose();
    }
  });

  const editWorkspaceTopologyCommand = vscode.commands.registerCommand("xswlZapVna.editWorkspaceTopology", async () => {
    const requestId = createRequestId();
    const panel = vscode.window.createWebviewPanel(
      "xswlZapVna.workspaceTopologyEditor",
      "XSWL Workspace Topology Editor",
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      },
    );

    panel.webview.html = buildWorkspaceTopologyEditorHtml(panel.webview, createNonce());

    const { address, deadlineMs, autoOpenOutput } = readConfig();
    const client = new ServiceClient({ address, deadlineMs });

    const postWorkspaceList = async () => {
      const list = await client.listWorkspaceTopologies();
      await panel.webview.postMessage({
        type: "workspace-list-result",
        items: list.items,
        activeWorkspaceId: list.activeWorkspaceId,
      });
    };

    panel.onDidDispose(() => {
      client.dispose();
    });

    panel.webview.onDidReceiveMessage(async (message: unknown) => {
      const payload = message as {
        type?: string;
        workspaceId?: string;
        topologyId?: string;
        topologyYaml?: string;
        activate?: boolean;
        selectors?: Array<{ type?: number; resourceId?: string }>;
      };

      const workspaceId = String(payload.workspaceId ?? "").trim();
      const topologyId = String(payload.topologyId ?? "").trim();
      const topologyYaml = String(payload.topologyYaml ?? "");

      try {
        if (payload.type === "workspace-list") {
          await postWorkspaceList();
          return;
        }

        if (payload.type === "workspace-load") {
          const item = await client.getWorkspaceTopology(workspaceId);
          await panel.webview.postMessage({ type: "workspace-load-result", ok: true, item });
          return;
        }

        if (payload.type === "workspace-save") {
          const requiredResources = extractRequiredResourcesFromTopologyYaml(topologyYaml);
          const precheck = await client.precheckWorkspaceTopology(
            workspaceId,
            topologyId,
            topologyYaml,
            requiredResources,
            Boolean(payload.activate),
            Boolean(payload.activate),
            {
              workspaceId,
              actor: "vscode.workspaceTopologyEditor",
            },
          );

          if (precheck && !precheck.ok) {
            const failureMessage = buildPrecheckFailureMessage(precheck);
            const selectors = collectConflictSelectors(precheck.lockConflicts);
            const lockSnapshot = selectors.length > 0
              ? await client.getLockSnapshot(selectors)
              : null;
            const lockSnapshotSummary = buildLockSnapshotSummary(lockSnapshot, precheck.lockConflicts.length);
            logBlock(outputChannel, "INFO", `[WorkspaceTopologyPrecheckBlocked][requestId=${requestId}]`, [
              `workspaceId=${workspaceId}, topologyId=${topologyId}, activate=${Boolean(payload.activate)}`,
              failureMessage,
              `conflictCount=${precheck.lockConflicts.length}, snapshotLeases=${lockSnapshot?.leases.length ?? -1}`,
            ]);
            showOutputIfEnabled(outputChannel, autoOpenOutput);

            await panel.webview.postMessage({
              type: "workspace-save-result",
              ok: false,
              message: `Precheck failed: ${failureMessage}`,
              lockSnapshotSummary,
              lockSnapshot,
              lockSnapshotSelectors: selectors,
              precheck: {
                code: precheck.code,
                message: precheck.message,
                topologyErrors: precheck.topologyErrors,
                lockConflicts: precheck.lockConflicts,
              },
            });
            return;
          }

          const result = await client.upsertWorkspaceTopology(
            workspaceId,
            topologyId,
            topologyYaml,
            Boolean(payload.activate),
          );

          const messageText = formatValidationResult(result);
          logBlock(outputChannel, "INFO", `[WorkspaceTopologySave][requestId=${requestId}]`, [
            `workspaceId=${workspaceId}, topologyId=${topologyId}, activate=${Boolean(payload.activate)}`,
            messageText,
          ]);
          showOutputIfEnabled(outputChannel, autoOpenOutput);

          await panel.webview.postMessage({
            type: "workspace-save-result",
            ok: result.ok,
            message: result.ok
              ? `Saved workspace ${workspaceId}${Boolean(payload.activate) ? " and activated" : ""}.`
              : `Save failed: ${messageText}`,
          });
          if (result.ok) {
            await postWorkspaceList();
          }
          return;
        }

        if (payload.type === "workspace-lock-snapshot") {
          const rawSelectors = Array.isArray(payload.selectors) ? payload.selectors : [];
          const normalizedSelectors = rawSelectors
            .map((item) => ({
              type: Number(item?.type ?? 1),
              resourceId: String(item?.resourceId ?? "").trim(),
            }))
            .filter((item) => item.resourceId.length > 0);
          const selectors = normalizedSelectors.length > 0
            ? normalizedSelectors
            : extractRequiredResourcesFromTopologyYaml(topologyYaml);

          const snapshot = await client.getLockSnapshot(selectors);
          await panel.webview.postMessage({
            type: "workspace-lock-snapshot-result",
            ok: Boolean(snapshot),
            selectors,
            snapshot,
            message: snapshot
              ? `Lock snapshot loaded (${snapshot.leases.length} leases).`
              : "Lock snapshot is unavailable on current server.",
          });
          return;
        }

        if (payload.type === "workspace-activate") {
          const result = await client.setActiveWorkspace(workspaceId);
          const messageText = formatValidationResult(result);
          logBlock(outputChannel, "INFO", `[WorkspaceTopologyActivate][requestId=${requestId}]`, [
            `workspaceId=${workspaceId}`,
            messageText,
          ]);
          showOutputIfEnabled(outputChannel, autoOpenOutput);

          await panel.webview.postMessage({
            type: "workspace-activate-result",
            ok: result.ok,
            message: result.ok ? `Active workspace switched to ${workspaceId}.` : `Activate failed: ${messageText}`,
          });
          if (result.ok) {
            await postWorkspaceList();
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logBlock(outputChannel, "ERROR", `[WorkspaceTopologyEditor][requestId=${requestId}]`, [errorMessage]);
        showOutputIfEnabled(outputChannel, autoOpenOutput);
        let resultType = "workspace-load-result";
        if (payload.type === "workspace-save") {
          resultType = "workspace-save-result";
        } else if (payload.type === "workspace-activate") {
          resultType = "workspace-activate-result";
        } else if (payload.type === "workspace-lock-snapshot") {
          resultType = "workspace-lock-snapshot-result";
        }
        await panel.webview.postMessage({
          type: resultType,
          ok: false,
          error: errorMessage,
          message: errorMessage,
        });
      }
    });
  });

  const controlCenterSidebarViewId = "xswlZapVna.controlCenterView";
  const controlCenterContainerId = "xswlZapVna";
  const controlCenterContainerCommandId = `workbench.view.extension.${controlCenterContainerId}`;
  const controlCenterFocusCommandId = `${controlCenterSidebarViewId}.focus`;
  let controlCenterSidebarView: vscode.WebviewView | null = null;
  let controlCenterSidebarSession: vscode.Disposable | null = null;

  const createControlCenterSession = (webview: vscode.Webview): vscode.Disposable => {
    const requestId = createRequestId();
    const { address, deadlineMs, autoOpenOutput } = readConfig();
    const client = new ServiceClient({ address, deadlineMs });
    let liveAbortController: AbortController | null = null;
    let disposed = false;

    const postMessage = async (payload: Record<string, unknown>) => {
      if (disposed) {
        return;
      }
      await webview.postMessage(payload);
    };

    const postWorkspaceList = async () => {
      const list = await client.listWorkspaceTopologies();
      await postMessage({
        type: "workspace-list-result",
        items: list.items,
        activeWorkspaceId: list.activeWorkspaceId,
      });
    };

    const postServiceStatus = async () => {
      const status = await client.getServiceStatus();
      await postMessage({ type: "service-status-result", ok: true, status });
    };

    const stopLiveStream = async (instanceId: string) => {
      if (liveAbortController) {
        liveAbortController.abort();
        liveAbortController = null;
      }
      try {
        await client.setScanState(instanceId, "hold");
      } catch {
        // ignore scan stop errors to avoid blocking UI lifecycle
      }
      await postMessage({ type: "live-state", active: false });
    };

    const messageDisposable = webview.onDidReceiveMessage(async (message: unknown) => {
      const payload = message as {
        type?: string;
        workspaceId?: string;
        topologyId?: string;
        topologyYaml?: string;
        activate?: boolean;
        instanceId?: string;
        scanState?: WaveformScanState;
        sampleCount?: number;
        mode?: "frequency" | "time";
        selectors?: Array<{ type?: number; resourceId?: string }>;
      };

      const workspaceId = String(payload.workspaceId ?? "").trim();
      const topologyId = String(payload.topologyId ?? "").trim();
      const topologyYaml = String(payload.topologyYaml ?? "");
      const instanceId = String(payload.instanceId ?? "inst0").trim() || "inst0";
      const sampleCountRaw = Number(payload.sampleCount ?? 256);
      const sampleCount = Number.isInteger(sampleCountRaw) && sampleCountRaw > 0 ? sampleCountRaw : 256;
      const mode = payload.mode === "time" ? "time" : "frequency";

      try {
        if (payload.type === "app-init") {
          await postWorkspaceList();
          await postServiceStatus();
          return;
        }

        if (payload.type === "service-status") {
          await postServiceStatus();
          return;
        }

        if (payload.type === "workspace-list") {
          await postWorkspaceList();
          return;
        }

        if (payload.type === "workspace-load") {
          const item = await client.getWorkspaceTopology(workspaceId);
          await postMessage({ type: "workspace-load-result", ok: true, item });
          return;
        }

        if (payload.type === "workspace-save") {
          const requiredResources = extractRequiredResourcesFromTopologyYaml(topologyYaml);
          const precheck = await client.precheckWorkspaceTopology(
            workspaceId,
            topologyId,
            topologyYaml,
            requiredResources,
            Boolean(payload.activate),
            Boolean(payload.activate),
            {
              workspaceId,
              instanceId,
              actor: "vscode.controlCenter",
            },
          );

          if (precheck && !precheck.ok) {
            const failureMessage = buildPrecheckFailureMessage(precheck);

            logBlock(outputChannel, "INFO", `[ControlCenterWorkspacePrecheckBlocked][requestId=${requestId}]`, [
              `workspaceId=${workspaceId}, topologyId=${topologyId}, activate=${Boolean(payload.activate)}`,
              failureMessage,
            ]);
            showOutputIfEnabled(outputChannel, autoOpenOutput);

            await postMessage({
              type: "workspace-save-result",
              ok: false,
              message: `Precheck failed: ${failureMessage}`,
              precheck: {
                code: precheck.code,
                message: precheck.message,
                topologyErrors: precheck.topologyErrors,
                lockConflicts: precheck.lockConflicts,
              },
            });
            return;
          }

          const result = await client.upsertWorkspaceTopology(
            workspaceId,
            topologyId,
            topologyYaml,
            Boolean(payload.activate),
          );
          const messageText = formatValidationResult(result);

          logBlock(outputChannel, "INFO", `[ControlCenterWorkspaceSave][requestId=${requestId}]`, [
            `workspaceId=${workspaceId}, topologyId=${topologyId}, activate=${Boolean(payload.activate)}`,
            messageText,
          ]);
          showOutputIfEnabled(outputChannel, autoOpenOutput);

          await postMessage({
            type: "workspace-save-result",
            ok: result.ok,
            message: result.ok
              ? `Saved workspace ${workspaceId}${Boolean(payload.activate) ? " and activated" : ""}.`
              : `Save failed: ${messageText}`,
          });

          if (result.ok) {
            await postWorkspaceList();
          }
          return;
        }

        if (payload.type === "workspace-lock-snapshot") {
          const rawSelectors = Array.isArray(payload.selectors) ? payload.selectors : [];
          const normalizedSelectors = rawSelectors
            .map((item) => ({
              type: Number(item?.type ?? 1),
              resourceId: String(item?.resourceId ?? "").trim(),
            }))
            .filter((item) => item.resourceId.length > 0);
          const selectors = normalizedSelectors.length > 0
            ? normalizedSelectors
            : extractRequiredResourcesFromTopologyYaml(topologyYaml);
          const snapshot = await client.getLockSnapshot(selectors);

          logBlock(outputChannel, "INFO", `[ControlCenterLockSnapshot][requestId=${requestId}]`, [
            `workspaceId=${workspaceId || ""}, selectors=${selectors.length}`,
            snapshot ? `leases=${snapshot.leases.length}` : "snapshot-unavailable",
          ]);
          showOutputIfEnabled(outputChannel, autoOpenOutput);

          await postMessage({
            type: "workspace-lock-snapshot-result",
            ok: Boolean(snapshot),
            selectors,
            snapshot,
            message: snapshot
              ? `Lock snapshot loaded (${snapshot.leases.length} leases).`
              : "Lock snapshot is unavailable on current server.",
          });
          return;
        }

        if (payload.type === "workspace-activate") {
          const result = await client.setActiveWorkspace(workspaceId);
          const messageText = formatValidationResult(result);
          logBlock(outputChannel, "INFO", `[ControlCenterWorkspaceActivate][requestId=${requestId}]`, [
            `workspaceId=${workspaceId}`,
            messageText,
          ]);
          showOutputIfEnabled(outputChannel, autoOpenOutput);

          await postMessage({
            type: "workspace-activate-result",
            ok: result.ok,
            message: result.ok ? `Active workspace switched to ${workspaceId}.` : `Activate failed: ${messageText}`,
          });

          if (result.ok) {
            await postWorkspaceList();
          }
          return;
        }

        if (payload.type === "open-visual-topology") {
          await vscode.commands.executeCommand("xswlZapVna.editWorkspaceTopology");
          return;
        }

        if (payload.type === "scan-get") {
          const scan = await client.getScanState(instanceId);
          await postMessage({ type: "scan-state-result", ok: true, ...scan });
          return;
        }

        if (payload.type === "scan-set") {
          const desiredState = payload.scanState === "single" || payload.scanState === "hold" ? payload.scanState : "continuous";
          const scan = await client.setScanState(instanceId, desiredState);
          await postMessage({ type: "scan-state-result", ok: true, ...scan });
          return;
        }

        if (payload.type === "waveform-snapshot") {
          const waveform = await client.acquireWaveform(instanceId, sampleCount, mode, "frame", 0, []);
          await postMessage({ type: "waveform-frame", waveform });
          return;
        }

        if (payload.type === "waveform-live-start") {
          await stopLiveStream(instanceId);

          const started = await client.setScanState(instanceId, "continuous");
          await postMessage({ type: "scan-state-result", ok: true, ...started });
          await postMessage({ type: "live-state", active: true });

          liveAbortController = new AbortController();
          const localAbort = liveAbortController;

          void client
            .streamWaveform(
              instanceId,
              sampleCount,
              mode,
              "frame",
              0,
              [],
              0,
              async (waveform) => {
                if (!disposed && liveAbortController === localAbort) {
                  await postMessage({ type: "waveform-frame", waveform });
                }
              },
              localAbort.signal,
            )
            .then(async () => {
              if (liveAbortController === localAbort) {
                liveAbortController = null;
                await postMessage({ type: "live-state", active: false });
              }
            })
            .catch(async (error) => {
              if (liveAbortController === localAbort) {
                liveAbortController = null;
                await postMessage({
                  type: "app-error",
                  message: error instanceof Error ? error.message : String(error),
                });
                await postMessage({ type: "live-state", active: false });
              }
            });
          return;
        }

        if (payload.type === "waveform-live-stop") {
          await stopLiveStream(instanceId);
          const scan = await client.getScanState(instanceId);
          await postMessage({ type: "scan-state-result", ok: true, ...scan });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logBlock(outputChannel, "ERROR", `[ControlCenter][requestId=${requestId}]`, [errorMessage]);
        showOutputIfEnabled(outputChannel, autoOpenOutput);
        await postMessage({
          type: "app-error",
          message: errorMessage,
        });
      }
    });

    return new vscode.Disposable(() => {
      disposed = true;
      if (liveAbortController) {
        liveAbortController.abort();
        liveAbortController = null;
      }
      messageDisposable.dispose();
      client.dispose();
    });
  };

  const controlCenterSidebarProvider: vscode.WebviewViewProvider = {
    resolveWebviewView(webviewView) {
      controlCenterSidebarView = webviewView;
      webviewView.webview.options = {
        enableScripts: true,
      };
      webviewView.webview.html = buildUnifiedControlCenterHtml(webviewView.webview, createNonce());

      if (controlCenterSidebarSession) {
        controlCenterSidebarSession.dispose();
      }
      controlCenterSidebarSession = createControlCenterSession(webviewView.webview);
    },
  };

  const controlCenterViewProviderRegistration = vscode.window.registerWebviewViewProvider(
    controlCenterSidebarViewId,
    controlCenterSidebarProvider,
    {
      webviewOptions: {
        retainContextWhenHidden: true,
      },
    },
  );

  const openControlCenterCommand = vscode.commands.registerCommand("xswlZapVna.openControlCenter", async () => {
    await vscode.commands.executeCommand(controlCenterContainerCommandId);
    await vscode.commands.executeCommand(controlCenterFocusCommandId);
    controlCenterSidebarView?.show?.(true);
  });

  const openControlCenterMaximizedCommand = vscode.commands.registerCommand("xswlZapVna.openControlCenterMaximized", async () => {
    await vscode.commands.executeCommand(controlCenterContainerCommandId);
    await vscode.commands.executeCommand(controlCenterFocusCommandId);
    controlCenterSidebarView?.show?.(true);

    const commandCandidates = [
      "workbench.action.toggleMaximizedView",
    ];

    const allCommands = new Set(await vscode.commands.getCommands(true));
    let executed = false;
    for (const commandId of commandCandidates) {
      if (!allCommands.has(commandId)) {
        continue;
      }
      try {
        await vscode.commands.executeCommand(commandId);
        executed = true;
        break;
      } catch {
        // try next candidate for compatibility across VS Code versions/layouts
      }
    }

    if (!executed) {
      vscode.window.showInformationMessage("当前 VS Code 版本不支持该视图最大化命令，已保持侧边栏原布局（不会切换到编辑区）。");
    }
  });

  const closeControlCenterSidebarCommand = vscode.commands.registerCommand("xswlZapVna.closeControlCenterSidebar", async () => {
    try {
      await vscode.commands.executeCommand("workbench.action.closeSidebar");
    } catch {
      // no-op if sidebar is not visible in current layout
    }
  });

  const getInstanceCapabilitiesCommand = vscode.commands.registerCommand("xswlZapVna.getInstanceCapabilities", async () => {
    const instanceIdInput = await vscode.window.showInputBox({
      prompt: "Instance ID",
      value: "inst0",
      ignoreFocusOut: true,
    });
    if (!instanceIdInput) {
      return;
    }

    const requestId = createRequestId();
    const { address, deadlineMs, autoOpenOutput } = readConfig();
    const client = new ServiceClient({ address, deadlineMs });

    try {
      const capabilities = await client.getInstanceCapabilities(instanceIdInput);
      const summary = formatInstanceCapabilities(capabilities);
      logBlock(outputChannel, "INFO", `[GetInstanceCapabilities][requestId=${requestId}]`, [
        `instanceId=${instanceIdInput}`,
        summary,
      ]);
      showOutputIfEnabled(outputChannel, autoOpenOutput);
      vscode.window.showInformationMessage(`InstanceCapabilities: ${summary} | req=${requestId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logBlock(outputChannel, "ERROR", `[GetInstanceCapabilities][requestId=${requestId}]`, [errorMessage]);
      showOutputIfEnabled(outputChannel, autoOpenOutput);
      vscode.window.showErrorMessage(`GetInstanceCapabilities failed: ${errorMessage} | req=${requestId}`);
    } finally {
      client.dispose();
    }
  });

  const acquireOnceCommand = vscode.commands.registerCommand("xswlZapVna.acquireOnce", async () => {
    const instanceIdInput = await vscode.window.showInputBox({
      prompt: "Instance ID",
      value: "inst0",
      ignoreFocusOut: true,
    });
    if (!instanceIdInput) {
      return;
    }

    const sampleCountInput = await vscode.window.showInputBox({
      prompt: "Sample count",
      value: "128",
      ignoreFocusOut: true,
      validateInput: (value) => {
        const parsed = Number(value);
        if (!Number.isInteger(parsed) || parsed <= 0) {
          return "Sample count must be a positive integer.";
        }
        return undefined;
      },
    });
    if (!sampleCountInput) {
      return;
    }

    const sampleCount = Number(sampleCountInput);
    const requestId = createRequestId();
    const { address, deadlineMs, autoOpenOutput } = readConfig();
    const client = new ServiceClient({ address, deadlineMs });

    try {
      const result = await client.acquireOnce(instanceIdInput, sampleCount);
      const message = formatAcquisitionSummary(result);
      logBlock(outputChannel, "INFO", `[AcquireOnce][requestId=${requestId}]`, [
        `instanceId=${instanceIdInput}, sampleCount=${sampleCount}`,
        message,
      ]);
      showOutputIfEnabled(outputChannel, autoOpenOutput);
      vscode.window.showInformationMessage(`Acquire: ${message} | req=${requestId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logBlock(outputChannel, "ERROR", `[AcquireOnce][requestId=${requestId}]`, [errorMessage]);
      showOutputIfEnabled(outputChannel, autoOpenOutput);
      vscode.window.showErrorMessage(`Acquire failed: ${errorMessage} | req=${requestId}`);
    } finally {
      client.dispose();
    }
  });

  const streamPreviewCommand = vscode.commands.registerCommand("xswlZapVna.streamPreview", async () => {
    const instanceIdInput = await vscode.window.showInputBox({
      prompt: "Instance ID",
      value: "inst0",
      ignoreFocusOut: true,
    });
    if (!instanceIdInput) {
      return;
    }

    const sampleCountInput = await vscode.window.showInputBox({
      prompt: "Sample count",
      value: "128",
      ignoreFocusOut: true,
      validateInput: (value) => {
        const parsed = Number(value);
        if (!Number.isInteger(parsed) || parsed <= 0) {
          return "Sample count must be a positive integer.";
        }
        return undefined;
      },
    });
    if (!sampleCountInput) {
      return;
    }

    const sampleCount = Number(sampleCountInput);
    const requestId = createRequestId();
    const { address, deadlineMs, autoOpenOutput } = readConfig();
    const client = new ServiceClient({ address, deadlineMs });
    const abortController = new AbortController();

    try {
      const summary = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "XSWL Stream Preview",
          cancellable: true,
        },
        async (progress, token) => {
          token.onCancellationRequested(() => {
            abortController.abort();
          });

          return client.streamPreview(
            instanceIdInput,
            sampleCount,
            (frame) => {
              if (frame.frameCount % 10 === 0) {
                progress.report({
                  message: `frames=${frame.frameCount}, last=${frame.lastFrameType}/${frame.lastPointCount}`,
                });
              }
            },
            abortController.signal,
          );
        },
      );

      const message = formatStreamPreviewSummary(summary);
      logBlock(outputChannel, "INFO", `[StreamPreview][requestId=${requestId}]`, [
        `instanceId=${instanceIdInput}, sampleCount=${sampleCount}`,
        message,
      ]);
      showOutputIfEnabled(outputChannel, autoOpenOutput);
      vscode.window.showInformationMessage(`StreamPreview: ${message} | req=${requestId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logBlock(outputChannel, "ERROR", `[StreamPreview][requestId=${requestId}]`, [errorMessage]);
      showOutputIfEnabled(outputChannel, autoOpenOutput);
      vscode.window.showErrorMessage(`StreamPreview failed: ${errorMessage} | req=${requestId}`);
    } finally {
      client.dispose();
    }
  });

  const importAcquisitionCommand = vscode.commands.registerCommand("xswlZapVna.importAcquisition", async () => {
    const activeFile = vscode.window.activeTextEditor?.document.fileName ?? "";
    const defaultJsonPath = activeFile.toLowerCase().endsWith(".json") ? activeFile : "";

    const jsonPathInput = await vscode.window.showInputBox({
      prompt: "Imported acquisition JSON path",
      value: defaultJsonPath,
      ignoreFocusOut: true,
      validateInput: (value) => (value.trim().length === 0 ? "JSON path is required." : undefined),
    });
    if (!jsonPathInput) {
      return;
    }

    const jsonPath = jsonPathInput.trim();
    const requestId = createRequestId();
    const { address, deadlineMs, autoOpenOutput } = readConfig();
    const client = new ServiceClient({ address, deadlineMs });

    try {
      const summary = await client.importAcquisition(jsonPath);
      const message = formatImportedAcquisitionSummary(summary);
      logBlock(outputChannel, "INFO", `[ImportAcquisition][requestId=${requestId}]`, [
        `jsonPath=${jsonPath}`,
        message,
      ]);
      showOutputIfEnabled(outputChannel, autoOpenOutput);
      vscode.window.showInformationMessage(`ImportAcquisition: ${message} | req=${requestId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logBlock(outputChannel, "ERROR", `[ImportAcquisition][requestId=${requestId}]`, [errorMessage]);
      showOutputIfEnabled(outputChannel, autoOpenOutput);
      vscode.window.showErrorMessage(`ImportAcquisition failed: ${errorMessage} | req=${requestId}`);
    } finally {
      client.dispose();
    }
  });

  const compareImportedAcquisitionCommand = vscode.commands.registerCommand(
    "xswlZapVna.compareImportedAcquisition",
    async () => {
      const instanceIdInput = await vscode.window.showInputBox({
        prompt: "Instance ID",
        value: "inst0",
        ignoreFocusOut: true,
      });
      if (!instanceIdInput) {
        return;
      }

      const activeFile = vscode.window.activeTextEditor?.document.fileName ?? "";
      const defaultJsonPath = activeFile.toLowerCase().endsWith(".json") ? activeFile : "";
      const jsonPathInput = await vscode.window.showInputBox({
        prompt: "Imported acquisition JSON path",
        value: defaultJsonPath,
        ignoreFocusOut: true,
        validateInput: (value) => (value.trim().length === 0 ? "JSON path is required." : undefined),
      });
      if (!jsonPathInput) {
        return;
      }

      const sampleCountInput = await vscode.window.showInputBox({
        prompt: "Sample count",
        value: "128",
        ignoreFocusOut: true,
        validateInput: (value) => {
          const parsed = Number(value);
          if (!Number.isInteger(parsed) || parsed <= 0) {
            return "Sample count must be a positive integer.";
          }
          return undefined;
        },
      });
      if (!sampleCountInput) {
        return;
      }

      const modeSelection = await vscode.window.showQuickPick(
        [
          { label: "frequency", description: "CW 频域采集后比对" },
          { label: "time", description: "Pulse 时域采集后比对" },
        ],
        {
          title: "Compare acquisition mode",
          ignoreFocusOut: true,
        },
      );
      if (!modeSelection) {
        return;
      }

      const toleranceInput = await vscode.window.showInputBox({
        prompt: "Compare tolerance",
        value: "1e-6",
        ignoreFocusOut: true,
        validateInput: (value) => {
          const parsed = Number(value);
          if (!Number.isFinite(parsed) || parsed <= 0) {
            return "Tolerance must be a positive number.";
          }
          return undefined;
        },
      });
      if (!toleranceInput) {
        return;
      }

      const sampleCount = Number(sampleCountInput);
      const tolerance = Number(toleranceInput);
      const jsonPath = jsonPathInput.trim();
      const mode = modeSelection.label as "frequency" | "time";

      const requestId = createRequestId();
      const { address, deadlineMs, autoOpenOutput } = readConfig();
      const client = new ServiceClient({ address, deadlineMs });

      try {
        const summary = await client.compareImportedAcquisition(
          jsonPath,
          instanceIdInput,
          sampleCount,
          tolerance,
          mode,
        );
        const message = formatCompareImportedAcquisitionSummary(summary);
        const logLines = [
          `instanceId=${instanceIdInput}, jsonPath=${jsonPath}, sampleCount=${sampleCount}, mode=${mode}, tolerance=${tolerance}`,
          message,
        ];
        logBlock(outputChannel, summary.matched ? "INFO" : "ERROR", `[CompareImportedAcquisition][requestId=${requestId}]`, logLines);
        showOutputIfEnabled(outputChannel, autoOpenOutput);

        if (summary.matched) {
          vscode.window.showInformationMessage(`CompareImportedAcquisition: matched | req=${requestId}`);
        } else {
          vscode.window.showWarningMessage(`CompareImportedAcquisition: mismatch | req=${requestId}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logBlock(outputChannel, "ERROR", `[CompareImportedAcquisition][requestId=${requestId}]`, [errorMessage]);
        showOutputIfEnabled(outputChannel, autoOpenOutput);
        vscode.window.showErrorMessage(`CompareImportedAcquisition failed: ${errorMessage} | req=${requestId}`);
      } finally {
        client.dispose();
      }
    },
  );

  const batchCompareImportedAcquisitionCommand = vscode.commands.registerCommand(
    "xswlZapVna.batchCompareImportedAcquisition",
    async () => {
      const instanceIdInput = await vscode.window.showInputBox({
        prompt: "Instance ID",
        value: "inst0",
        ignoreFocusOut: true,
      });
      if (!instanceIdInput) {
        return;
      }

      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? "";
      const folderInput = await vscode.window.showInputBox({
        prompt: "Directory to scan JSON baselines (recursive)",
        value: workspaceRoot,
        ignoreFocusOut: true,
        validateInput: (value) => {
          const normalized = value.trim();
          if (normalized.length === 0) {
            return "Directory path is required.";
          }
          if (!fs.existsSync(normalized) || !fs.statSync(normalized).isDirectory()) {
            return "Directory does not exist.";
          }
          return undefined;
        },
      });
      if (!folderInput) {
        return;
      }

      const sampleCountInput = await vscode.window.showInputBox({
        prompt: "Sample count",
        value: "128",
        ignoreFocusOut: true,
        validateInput: (value) => {
          const parsed = Number(value);
          if (!Number.isInteger(parsed) || parsed <= 0) {
            return "Sample count must be a positive integer.";
          }
          return undefined;
        },
      });
      if (!sampleCountInput) {
        return;
      }

      const modeSelection = await vscode.window.showQuickPick(
        [
          { label: "frequency", description: "CW 频域批量比对" },
          { label: "time", description: "Pulse 时域批量比对" },
        ],
        {
          title: "Batch compare acquisition mode",
          ignoreFocusOut: true,
        },
      );
      if (!modeSelection) {
        return;
      }

      const toleranceInput = await vscode.window.showInputBox({
        prompt: "Compare tolerance",
        value: "1e-6",
        ignoreFocusOut: true,
        validateInput: (value) => {
          const parsed = Number(value);
          if (!Number.isFinite(parsed) || parsed <= 0) {
            return "Tolerance must be a positive number.";
          }
          return undefined;
        },
      });
      if (!toleranceInput) {
        return;
      }

      const scanDir = folderInput.trim();
      const sampleCount = Number(sampleCountInput);
      const tolerance = Number(toleranceInput);
      const mode = modeSelection.label as "frequency" | "time";

      const reportOutputSelection = await vscode.window.showQuickPick(
        [
          { label: "yes", description: "Write structured JSON report to file" },
          { label: "no", description: "Only show summary in output" },
        ],
        {
          title: "Write batch compare report JSON?",
          ignoreFocusOut: true,
        },
      );
      if (!reportOutputSelection) {
        return;
      }

      let reportPath = "";
      if (reportOutputSelection.label === "yes") {
        const defaultReportPath = path.join(scanDir, `batch_compare_report_${Date.now()}.json`);
        const reportPathInput = await vscode.window.showInputBox({
          prompt: "Batch compare report output path",
          value: defaultReportPath,
          ignoreFocusOut: true,
          validateInput: (value) => {
            const normalized = value.trim();
            if (normalized.length === 0) {
              return "Report path is required.";
            }

            const parentDir = path.dirname(normalized);
            if (!fs.existsSync(parentDir)) {
              return "Parent directory does not exist.";
            }

            return undefined;
          },
        });
        if (!reportPathInput) {
          return;
        }
        reportPath = reportPathInput.trim();
      }

      const requestId = createRequestId();
      const { address, deadlineMs, autoOpenOutput } = readConfig();
      const client = new ServiceClient({ address, deadlineMs });

      try {
        const jsonPaths = collectJsonFilesRecursively(scanDir);
        if (jsonPaths.length === 0) {
          vscode.window.showWarningMessage(`No JSON baseline found under ${scanDir}.`);
          return;
        }

        const summary = {
          total: jsonPaths.length,
          matched: 0,
          mismatched: 0,
          failed: 0,
        };
        const caseResults: BatchCompareCaseRecord[] = [];

        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "XSWL Batch Compare Imported Acquisition",
            cancellable: true,
          },
          async (progress, token) => {
            for (let index = 0; index < jsonPaths.length; index += 1) {
              if (token.isCancellationRequested) {
                throw new Error("batch compare canceled by user");
              }

              const jsonPath = jsonPaths[index];
              progress.report({
                increment: (100 / jsonPaths.length),
                message: `${index + 1}/${jsonPaths.length}: ${path.basename(jsonPath)}`,
              });

              try {
                const result = await client.compareImportedAcquisition(
                  jsonPath,
                  instanceIdInput,
                  sampleCount,
                  tolerance,
                  mode,
                );
                const message = formatCompareImportedAcquisitionSummary(result);
                logBlock(
                  outputChannel,
                  result.matched ? "INFO" : "ERROR",
                  `[BatchCompareImportedAcquisition][requestId=${requestId}]`,
                  [
                    `index=${index + 1}/${jsonPaths.length}, jsonPath=${jsonPath}`,
                    message,
                  ],
                );

                if (result.matched) {
                  summary.matched += 1;
                  caseResults.push({
                    index: index + 1,
                    jsonPath,
                    status: "matched",
                    detail: result.detail,
                    grpcCompareToken: result.grpcCompareToken,
                    error: "",
                  });
                } else {
                  summary.mismatched += 1;
                  caseResults.push({
                    index: index + 1,
                    jsonPath,
                    status: "mismatched",
                    detail: result.detail,
                    grpcCompareToken: result.grpcCompareToken,
                    error: "",
                  });
                }
              } catch (error) {
                summary.failed += 1;
                const errorMessage = error instanceof Error ? error.message : String(error);
                caseResults.push({
                  index: index + 1,
                  jsonPath,
                  status: "failed",
                  detail: "",
                  grpcCompareToken: "",
                  error: errorMessage,
                });
                logBlock(outputChannel, "ERROR", `[BatchCompareImportedAcquisition][requestId=${requestId}]`, [
                  `index=${index + 1}/${jsonPaths.length}, jsonPath=${jsonPath}`,
                  `failed=${errorMessage}`,
                ]);
              }
            }
          },
        );

        const summaryText = formatBatchCompareImportedSummary(summary);
        logBlock(outputChannel, "INFO", `[BatchCompareImportedAcquisitionSummary][requestId=${requestId}]`, [
          `instanceId=${instanceIdInput}, scanDir=${scanDir}, sampleCount=${sampleCount}, mode=${mode}, tolerance=${tolerance}`,
          summaryText,
        ]);

        if (reportPath.length > 0) {
          const report: BatchCompareReport = {
            requestId,
            generatedAt: nowTimestamp(),
            instanceId: instanceIdInput,
            scanDir,
            mode,
            sampleCount,
            tolerance,
            summary,
            cases: caseResults,
          };

          fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
          logBlock(outputChannel, "INFO", `[BatchCompareImportedAcquisitionReport][requestId=${requestId}]`, [
            `reportPath=${reportPath}`,
          ]);
        }

        showOutputIfEnabled(outputChannel, autoOpenOutput);

        if (summary.failed > 0 || summary.mismatched > 0) {
          vscode.window.showWarningMessage(`BatchCompareImportedAcquisition: ${summaryText} | req=${requestId}`);
        } else {
          vscode.window.showInformationMessage(`BatchCompareImportedAcquisition: ${summaryText} | req=${requestId}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logBlock(outputChannel, "ERROR", `[BatchCompareImportedAcquisition][requestId=${requestId}]`, [errorMessage]);
        showOutputIfEnabled(outputChannel, autoOpenOutput);
        vscode.window.showErrorMessage(`BatchCompareImportedAcquisition failed: ${errorMessage} | req=${requestId}`);
      } finally {
        client.dispose();
      }
    },
  );

  const previewWaveformCommand = vscode.commands.registerCommand("xswlZapVna.previewWaveform", async () => {
    const instanceIdInput = await vscode.window.showInputBox({
      prompt: "Instance ID",
      value: "inst0",
      ignoreFocusOut: true,
    });
    if (!instanceIdInput) {
      return;
    }

    const sampleCountInput = await vscode.window.showInputBox({
      prompt: "Sample count",
      value: "256",
      ignoreFocusOut: true,
      validateInput: (value) => {
        const parsed = Number(value);
        if (!Number.isInteger(parsed) || parsed <= 0) {
          return "Sample count must be a positive integer.";
        }
        return undefined;
      },
    });
    if (!sampleCountInput) {
      return;
    }

    const sampleCount = Number(sampleCountInput);
    const modeSelection = await vscode.window.showQuickPick(
      [
        { label: "frequency", description: "CW 频域波形" },
        { label: "time", description: "Pulse 时域波形" },
      ],
      {
        title: "Waveform mode",
        ignoreFocusOut: true,
      },
    );
    if (!modeSelection) {
      return;
    }

    let waveformMode = modeSelection.label as "frequency" | "time";
    let traceSource: WaveformTraceSource = "frame";
    let channelIndex = 0;
    let visibleTraceIds: string[] = [];
    if (waveformMode === "frequency") {
      const traceSelection = await vscode.window.showQuickPick(
        [
          { label: "frame", description: "频域帧主曲线" },
          { label: "receiverRaw", description: "接收机原始通道（可选 channel）" },
          { label: "receiverCompensated", description: "接收机补偿通道（可选 channel）" },
          { label: "sParameterS11", description: "S 参数 S11" },
          { label: "all", description: "叠加显示 frame/raw/comp/s11" },
        ],
        {
          title: "Trace source",
          ignoreFocusOut: true,
        },
      );
      if (!traceSelection) {
        return;
      }
      traceSource = traceSelection.label as WaveformTraceSource;

      if (
        traceSource === "receiverRaw" ||
        traceSource === "receiverCompensated" ||
        traceSource === "all"
      ) {
        const channelInput = await vscode.window.showInputBox({
          prompt: "Receiver channel index",
          value: "0",
          ignoreFocusOut: true,
          validateInput: (value) => {
            const parsed = Number(value);
            if (!Number.isInteger(parsed) || parsed < 0 || parsed > 31) {
              return "Channel index must be an integer between 0 and 31.";
            }
            return undefined;
          },
        });
        if (!channelInput) {
          return;
        }
        channelIndex = Number(channelInput);
      }

      if (traceSource === "all") {
        const visibilitySelection = await vscode.window.showQuickPick(
          [
            { label: "frame", picked: true },
            { label: "receiverRaw", picked: true },
            { label: "receiverCompensated", picked: true },
            { label: "s11", picked: true },
          ],
          {
            title: "Visible traces (all mode)",
            ignoreFocusOut: true,
            canPickMany: true,
          },
        );
        if (!visibilitySelection || visibilitySelection.length === 0) {
          return;
        }
        visibleTraceIds = visibilitySelection.map((item) => item.label);
      }
    }
    const previewTypeSelection = await vscode.window.showQuickPick(
      [
        { label: "snapshot", description: "单次采集后打开图形" },
        { label: "live", description: "持续流式自动刷新（直到取消）" },
      ],
      {
        title: "Preview type",
        ignoreFocusOut: true,
      },
    );
    if (!previewTypeSelection) {
      return;
    }

    const liveMaxFrames = 0;

    const requestId = createRequestId();
    const { address, deadlineMs, autoOpenOutput } = readConfig();
    const client = new ServiceClient({ address, deadlineMs });

    try {
      const capabilities = await client.getInstanceCapabilities(instanceIdInput);
      const capabilitiesSummary = formatInstanceCapabilities(capabilities);
      logBlock(outputChannel, "INFO", `[PreviewWaveformCapabilities][requestId=${requestId}]`, [
        `instanceId=${instanceIdInput}`,
        capabilitiesSummary,
      ]);
      showOutputIfEnabled(outputChannel, autoOpenOutput);

      if (waveformMode === "time" && !capabilities.supportsPulseExcitation) {
        vscode.window.showWarningMessage("Current instance does not support pulse excitation, fallback to frequency mode.");
        waveformMode = "frequency";
      }

      const panel = vscode.window.createWebviewPanel(
        "xswlWaveformPreview",
        `XSWL Waveform: ${instanceIdInput}`,
        vscode.ViewColumn.Beside,
        { enableScripts: true },
      );

      let currentScanState: WaveformScanState = previewTypeSelection.label === "live" ? "continuous" : "single";
      let liveFrameCount = 0;
      let liveStreamActive = previewTypeSelection.label === "live";
      let latestWaveformForUi: WaveformPreviewData | null = null;
      let liveOverlayState = createLiveWaveformOverlayState();
      let lastRenderAtMs = 0;
      let webviewInitialized = false;
      let postMessageInFlight = false;
      let queuedWaveformForUi: WaveformPreviewData | null = null;

      const estimateRenderIntervalMs = (waveform: WaveformPreviewData): number => {
        const totalPoints = waveform.traces.reduce((sum, trace) => sum + trace.points.length, 0);
        if (totalPoints >= 4500) {
          return 320;
        }
        if (totalPoints >= 2800) {
          return 260;
        }
        if (totalPoints >= 1600) {
          return 210;
        }
        return 170;
      };

      const renderWaveform = (waveform: WaveformPreviewData): void => {
        const waveformWithState = withScanState(waveform, currentScanState, liveStreamActive, liveFrameCount);
        if (!webviewInitialized) {
          panel.webview.html = buildWaveformPreviewHtml(waveformWithState);
          webviewInitialized = true;
          return;
        }

        if (postMessageInFlight) {
          queuedWaveformForUi = waveformWithState;
          return;
        }

        postMessageInFlight = true;
        const postPromise = panel.webview.postMessage({
          type: "waveform-update",
          payload: buildWaveformPreviewUpdatePayload(waveformWithState),
        });

        void Promise.resolve(postPromise).finally(() => {
          postMessageInFlight = false;
          if (!queuedWaveformForUi) {
            return;
          }
          const latestQueued = queuedWaveformForUi;
          queuedWaveformForUi = null;
          renderWaveform(latestQueued);
        });
      };

      panel.webview.onDidReceiveMessage(async (message: unknown) => {
        const payload = message as { type?: string; text?: string; level?: string; message?: string; detail?: string };
        if (payload.type === "webview-log") {
          const level = String(payload.level ?? "info").toLowerCase() === "error" ? "ERROR" : "INFO";
          const lines = [
            String(payload.message ?? "webview event"),
            String(payload.detail ?? ""),
          ].filter((line) => line.length > 0);
          logBlock(outputChannel, level as LogLevel, `[PreviewWaveformWebview][requestId=${requestId}]`, lines);
          showOutputIfEnabled(outputChannel, autoOpenOutput);
          return;
        }

        if (payload.type === "set-scan-state") {
          const state = String((message as { state?: string }).state ?? "") as WaveformScanState;
          if (state !== "continuous" && state !== "single" && state !== "hold") {
            return;
          }
          try {
            const result = await client.setScanState(instanceIdInput, state);
            currentScanState = result.scanState;
            liveStreamActive = result.streamActive;
            logBlock(outputChannel, "INFO", `[PreviewWaveformSetScanState][requestId=${requestId}]`, [
              `instanceId=${result.instanceId}, state=${result.scanState}, streamActive=${result.streamActive}, message=${result.message}`,
            ]);
            showOutputIfEnabled(outputChannel, autoOpenOutput);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logBlock(outputChannel, "ERROR", `[PreviewWaveformSetScanState][requestId=${requestId}]`, [errorMessage]);
            showOutputIfEnabled(outputChannel, autoOpenOutput);
            vscode.window.showErrorMessage(`Set scan state failed: ${errorMessage}`);
          }

          if (latestWaveformForUi) {
            renderWaveform(latestWaveformForUi);
          }
          return;
        }

        if (payload.type === "ui-interaction") {
          // keep channel for compatibility; rendering no longer pauses on hover/interaction.
          return;
        }

        if (payload.type !== "copy-primary-marker") {
          return;
        }
        const text = String(payload.text ?? "").trim();
        if (text.length === 0) {
          return;
        }
        try {
          await vscode.env.clipboard.writeText(text);
          panel.webview.postMessage({
            type: "copy-primary-marker-result",
            ok: true,
            message: "Primary marker copied.",
          });
          vscode.window.showInformationMessage("Primary marker copied to clipboard.");
        } catch (error) {
          panel.webview.postMessage({
            type: "copy-primary-marker-result",
            ok: false,
            message: "Copy failed.",
          });
        }
      });

      if (previewTypeSelection.label === "snapshot") {
        const waveform = await client.acquireWaveform(
          instanceIdInput,
          sampleCount,
          waveformMode,
          traceSource,
          channelIndex,
          visibleTraceIds,
        );
        latestWaveformForUi = waveform;
        renderWaveform(waveform);

        logBlock(outputChannel, "INFO", `[PreviewWaveform][requestId=${requestId}]`, [
          `instanceId=${instanceIdInput}, mode=${waveformMode}, source=${traceSource}, channel=${channelIndex}, visible=${visibleTraceIds.join(",") || "all"}, preview=snapshot, sampleCount=${sampleCount}, frame=${waveform.frameType}, traces=${waveform.traces.length}, points=${waveform.points.length}`,
          `markers=${waveform.markers.map((marker) => `${marker.label}(${marker.x.toFixed(4)},${marker.y.toFixed(4)})`).join(";")}`,
        ]);
        showOutputIfEnabled(outputChannel, autoOpenOutput);
        vscode.window.showInformationMessage(
          `Waveform preview opened: frame=${waveform.frameType}, points=${waveform.points.length} | req=${requestId}`,
        );
      } else {
        const abortController = new AbortController();
        panel.onDidDispose(() => abortController.abort());

        try {
          const current = await client.getScanState(instanceIdInput);
          currentScanState = current.scanState;
          liveStreamActive = current.streamActive;
        } catch (error) {
          currentScanState = "continuous";
          liveStreamActive = true;
        }

        const finalWaveform = await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "XSWL Waveform Live Preview",
            cancellable: true,
          },
          async (progress, token) => {
            token.onCancellationRequested(() => abortController.abort());

            return client.streamWaveform(
              instanceIdInput,
              sampleCount,
              waveformMode,
              traceSource,
              channelIndex,
              visibleTraceIds,
              liveMaxFrames,
              (waveform, frameCount) => {
                const enhanced = applyLiveFrequencyOverlays(waveform, liveOverlayState, 8);
                liveOverlayState = enhanced.state;
                liveFrameCount = frameCount;
                liveStreamActive = true;
                latestWaveformForUi = enhanced.waveform;
                const nowMs = Date.now();

                if (frameCount === 1 || frameCount % 3 === 0) {
                  const minRenderIntervalMs = estimateRenderIntervalMs(enhanced.waveform);
                  if (nowMs - lastRenderAtMs < minRenderIntervalMs) {
                    return;
                  }
                  lastRenderAtMs = nowMs;
                  renderWaveform(enhanced.waveform);
                  progress.report({
                    message: `frames=${frameCount}, points=${enhanced.waveform.points.length}, traces=${enhanced.waveform.traces.length}, scan=${currentScanState}`,
                  });
                }
              },
              abortController.signal,
            );
          },
        );

        liveStreamActive = false;
        latestWaveformForUi = finalWaveform;
        renderWaveform(finalWaveform);

        logBlock(outputChannel, "INFO", `[PreviewWaveform][requestId=${requestId}]`, [
          `instanceId=${instanceIdInput}, mode=${waveformMode}, source=${traceSource}, channel=${channelIndex}, visible=${visibleTraceIds.join(",") || "all"}, preview=live, sampleCount=${sampleCount}, frameLimit=unlimited, frame=${finalWaveform.frameType}, traces=${finalWaveform.traces.length}, points=${finalWaveform.points.length}`,
          `markers=${finalWaveform.markers.map((marker) => `${marker.label}(${marker.x.toFixed(4)},${marker.y.toFixed(4)})`).join(";")}`,
        ]);
        showOutputIfEnabled(outputChannel, autoOpenOutput);
        vscode.window.showInformationMessage(
          `Live waveform preview finished: frame=${finalWaveform.frameType}, points=${finalWaveform.points.length} | req=${requestId}`,
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logBlock(outputChannel, "ERROR", `[PreviewWaveform][requestId=${requestId}]`, [errorMessage]);
      showOutputIfEnabled(outputChannel, autoOpenOutput);
      vscode.window.showErrorMessage(`PreviewWaveform failed: ${errorMessage} | req=${requestId}`);
    } finally {
      client.dispose();
    }
  });

  context.subscriptions.push(
    outputChannel,
    controlCenterViewProviderRegistration,
    new vscode.Disposable(() => {
      if (controlCenterSidebarSession) {
        controlCenterSidebarSession.dispose();
        controlCenterSidebarSession = null;
      }
      controlCenterSidebarView = null;
    }),
    openOutputCommand,
    clearOutputCommand,
    getServiceStatusCommand,
    getInstanceCapabilitiesCommand,
    validateTopologyCommand,
    editWorkspaceTopologyCommand,
    openControlCenterCommand,
    openControlCenterMaximizedCommand,
    closeControlCenterSidebarCommand,
    acquireOnceCommand,
    streamPreviewCommand,
    importAcquisitionCommand,
    compareImportedAcquisitionCommand,
    batchCompareImportedAcquisitionCommand,
    previewWaveformCommand,
  );
}

export function deactivate(): void {
}
