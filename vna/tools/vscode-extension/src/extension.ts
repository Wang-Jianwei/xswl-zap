import * as vscode from "vscode";
import {
  formatAcquisitionSummary,
  formatServiceStatus,
  formatServiceStatusMultiline,
  formatStreamPreviewSummary,
  formatValidationResult,
} from "./statusFormatter";
import { ServiceClient } from "./serviceClient";

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

  context.subscriptions.push(
    outputChannel,
    openOutputCommand,
    clearOutputCommand,
    getServiceStatusCommand,
    validateTopologyCommand,
    acquireOnceCommand,
    streamPreviewCommand,
  );
}

export function deactivate(): void {
}
