import { AplPreviewWebviewPanel } from "./models/AplPreviewWebviewPanel";
import * as vscode from "vscode";
import { getDefaultViewport, getViewportProfiles } from "apl-suggester";

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "alexa-presentation-language-preview.previewApl",
    () => {
      const textEditor = vscode.window.activeTextEditor;
      const aplPreviewWebviewPanel = new AplPreviewWebviewPanel(context);

      const selectViewportDisposable = vscode.commands.registerCommand(
        "alexa-presentation-language-preview.selectViewport",
        async () => {
          // Ask ViewportProfile name to set
          const viewportProfiles = getViewportProfiles()
            .map((v) => {
              return {
                label: v.name,
                description: `${v.exampleDevices.length} profiles`,
              } as vscode.QuickPickItem;
            })
            .valueSeq()
            .toArray();

          const selectedViewportProfileName = await vscode.window.showQuickPick(
            viewportProfiles
          );

          if (!selectedViewportProfileName) {
            return;
          }

          const selectedViewportProfile = getViewportProfiles().find(
            (v) => v.name === selectedViewportProfileName.label
          );

          // Ask Viewport name to set
          const viewports = selectedViewportProfile?.exampleDevices.map((d) => {
            return {
              label: d.name,
            } as vscode.QuickPickItem;
          });

          if (!viewports) {
            return;
          }

          const selectedViewportName = await vscode.window.showQuickPick(
            viewports
          );
          const newViewport = selectedViewportProfile?.exampleDevices.find(
            (d) => d.name === selectedViewportName?.label
          );

          if (!newViewport) {
            return;
          }

          // Update Webview with new viewport
          aplPreviewWebviewPanel.aplConfiguration.viewport = newViewport;
          aplPreviewWebviewPanel.updateAplPreview();
          statusBarItem.text = selectedViewportProfileName.label;
        }
      );
      context.subscriptions.push(selectViewportDisposable);

      const statusBarItem = vscode.window.createStatusBarItem();
      statusBarItem.command =
        "alexa-presentation-language-preview.selectViewport";
      statusBarItem.name = "Select Viewport Profile";
      statusBarItem.text = getDefaultViewport().name;
      statusBarItem.show();

      aplPreviewWebviewPanel.webviewPanel.onDidDispose(
        () => {
          statusBarItem.dispose();
          selectViewportDisposable.dispose();
        },
        null,
        context.subscriptions
      );

      vscode.workspace.onDidSaveTextDocument((document) => {
        try {
          if (document.uri === textEditor?.document.uri) {
            aplPreviewWebviewPanel.aplConfiguration.aplPayload = JSON.parse(
              document.getText()
            );
            aplPreviewWebviewPanel.updateAplPreview();
          }
        } catch (e) {
          vscode.window.showInformationMessage("Your json seems to be invalid");
        }
      });
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
