import * as vscode from "vscode";
import {
  formatAcquisitionSummary,
  formatServiceStatus,
  formatServiceStatusMultiline,
  formatStreamPreviewSummary,
  formatValidationResult,
} from "./statusFormatter";
import { ServiceClient } from "./serviceClient";
import { applyLiveFrequencyOverlays, createLiveWaveformOverlayState } from "./liveWaveformOverlay";
import { buildWaveformPreviewHtml } from "./waveformPreview";
import type { WaveformTraceSource } from "./types";

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

    const waveformMode = modeSelection.label as "frequency" | "time";
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
        { label: "live", description: "短时流式自动刷新" },
      ],
      {
        title: "Preview type",
        ignoreFocusOut: true,
      },
    );
    if (!previewTypeSelection) {
      return;
    }

    let liveMaxFrames = 30;
    if (previewTypeSelection.label === "live") {
      const maxFramesInput = await vscode.window.showInputBox({
        prompt: "Live refresh max frames",
        value: "30",
        ignoreFocusOut: true,
        validateInput: (value) => {
          const parsed = Number(value);
          if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 200) {
            return "Max frames must be an integer between 1 and 200.";
          }
          return undefined;
        },
      });
      if (!maxFramesInput) {
        return;
      }
      liveMaxFrames = Number(maxFramesInput);
    }

    const requestId = createRequestId();
    const { address, deadlineMs, autoOpenOutput } = readConfig();
    const client = new ServiceClient({ address, deadlineMs });

    try {
      const panel = vscode.window.createWebviewPanel(
        "xswlWaveformPreview",
        `XSWL Waveform: ${instanceIdInput}`,
        vscode.ViewColumn.Beside,
        { enableScripts: true },
      );

      panel.webview.onDidReceiveMessage(async (message: unknown) => {
        const payload = message as { type?: string; text?: string };
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
        panel.webview.html = buildWaveformPreviewHtml(waveform);

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
        let liveOverlayState = createLiveWaveformOverlayState();

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
                if (frameCount === 1 || frameCount % 3 === 0 || frameCount === liveMaxFrames) {
                  const enhanced = applyLiveFrequencyOverlays(waveform, liveOverlayState, 8);
                  liveOverlayState = enhanced.state;
                  panel.webview.html = buildWaveformPreviewHtml(enhanced.waveform);
                  progress.report({
                    message: `frames=${frameCount}, points=${enhanced.waveform.points.length}, traces=${enhanced.waveform.traces.length}`,
                  });
                }
              },
              abortController.signal,
            );
          },
        );

        logBlock(outputChannel, "INFO", `[PreviewWaveform][requestId=${requestId}]`, [
          `instanceId=${instanceIdInput}, mode=${waveformMode}, source=${traceSource}, channel=${channelIndex}, visible=${visibleTraceIds.join(",") || "all"}, preview=live, sampleCount=${sampleCount}, maxFrames=${liveMaxFrames}, frame=${finalWaveform.frameType}, traces=${finalWaveform.traces.length}, points=${finalWaveform.points.length}`,
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
    openOutputCommand,
    clearOutputCommand,
    getServiceStatusCommand,
    validateTopologyCommand,
    acquireOnceCommand,
    streamPreviewCommand,
    previewWaveformCommand,
  );
}

export function deactivate(): void {
}
