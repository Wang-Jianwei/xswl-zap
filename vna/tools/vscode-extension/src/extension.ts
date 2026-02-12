import * as vscode from "vscode";
import { formatServiceStatus } from "./statusFormatter";
import { ServiceClient } from "./serviceClient";

function readConfig(): { address: string; deadlineMs: number } {
  const config = vscode.workspace.getConfiguration("xswlZapVna");
  const address = config.get<string>("grpcAddress", "127.0.0.1:50051");
  const deadlineMs = config.get<number>("grpcDeadlineMs", 2000);
  return { address, deadlineMs };
}

export function activate(context: vscode.ExtensionContext): void {
  const command = vscode.commands.registerCommand("xswlZapVna.getServiceStatus", async () => {
    const { address, deadlineMs } = readConfig();
    const client = new ServiceClient({ address, deadlineMs });

    try {
      const status = await client.getServiceStatus();
      const message = formatServiceStatus(status);
      vscode.window.showInformationMessage(`VNA Service: ${message}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`GetServiceStatus failed: ${errorMessage}`);
    } finally {
      client.dispose();
    }
  });

  context.subscriptions.push(command);
}

export function deactivate(): void {
}
