import { AplConfiguration } from "./models/AplConfiguration";
import * as vscode from "vscode";
import { getDefaultViewport, getViewportProfiles } from "apl-suggester";
import { viewportCharacteristicsFromViewPort } from "./utils/viewportCharacteristicsFromViewPort";
import { configureAplPreviewWebviewPanel } from "./utils/configureAplPreviewWebviewPanel";

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "alexa-presentation-language-preview.previewApl",
    () => {
      const aplConfiguration = new AplConfiguration();
      const textEditor = vscode.window.activeTextEditor;
      const webViewPanel = configureAplPreviewWebviewPanel(context);

      vscode.commands.registerCommand(
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
          aplConfiguration.viewport = newViewport;
          webViewPanel.webview.postMessage({
            document: JSON.stringify(aplConfiguration.aplPayload.document),
            datasources: JSON.stringify(
              aplConfiguration.aplPayload.datasources
            ),
            viewport: JSON.stringify(
              viewportCharacteristicsFromViewPort(newViewport)
            ),
          });
          statusBarItem.text = selectedViewportProfileName.label;
        }
      );
      const statusBarItem = vscode.window.createStatusBarItem();
      statusBarItem.command =
        "alexa-presentation-language-preview.selectViewport";
      statusBarItem.name = "Select Viewport Profile";
      statusBarItem.text = getDefaultViewport().name;
      statusBarItem.show();

      webViewPanel.webview.onDidReceiveMessage(
        (message) => {
          switch (message.command) {
            case "initialize":
              const currentDocument = textEditor?.document;
              if (currentDocument) {
                aplConfiguration.aplPayload = JSON.parse(
                  currentDocument.getText()
                );

                webViewPanel.webview.postMessage({
                  document: JSON.stringify(
                    aplConfiguration.aplPayload.document
                  ),
                  datasources: JSON.stringify(
                    aplConfiguration.aplPayload.datasources
                  ),
                  viewport: JSON.stringify(
                    viewportCharacteristicsFromViewPort(
                      aplConfiguration.viewport
                    )
                  ),
                });
              }
              return;
            case "alert":
              vscode.window.showErrorMessage(message.text);
              return;
          }
        },
        undefined,
        context.subscriptions
      );

      vscode.workspace.onDidSaveTextDocument((document) => {
        try {
          if (document.uri === textEditor?.document.uri) {
            aplConfiguration.aplPayload = JSON.parse(document.getText());

            webViewPanel.webview.postMessage({
              document: JSON.stringify(aplConfiguration.aplPayload.document),
              datasources: JSON.stringify(
                aplConfiguration.aplPayload.datasources
              ),
              viewport: JSON.stringify(
                viewportCharacteristicsFromViewPort(aplConfiguration.viewport)
              ),
            });
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
