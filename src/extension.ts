import { AplConfiguration } from "./models/AplConfiguration";
import * as vscode from "vscode";
import { Uri } from "vscode";
import {
  getDefaultViewport,
  getViewportProfiles,
  IViewport,
  ViewportShape,
} from "apl-suggester";
import { buildPreviewHtml } from "./utils/buildPreviewHtml";

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "alexa-presentation-language-preview.previewApl",
    () => {
      const webView = vscode.window.createWebviewPanel(
        "aplView",
        "APL Preview",
        {
          viewColumn: vscode.ViewColumn.Beside,
        },
        {
          enableScripts: true,
        }
      );
      const aplConfiguration = new AplConfiguration();

      const aplPreviewJsLocation = Uri.joinPath(
        context.extensionUri,
        "assets/aplPreview.js"
      );
      const viewhostWebLocation = Uri.joinPath(
        context.extensionUri,
        "/node_modules/apl-viewhost-web/index.js"
      );
      const aplPreviewJsUrl =
        webView.webview.asWebviewUri(aplPreviewJsLocation);
      const viewhostWebJsUrl =
        webView.webview.asWebviewUri(viewhostWebLocation);
      const textEditor = vscode.window.activeTextEditor;

      vscode.commands.registerCommand(
        "alexa-presentation-language-preview.selectViewports",
        async () => {
          const viewportProfiles = getViewportProfiles()
            .map((v) => {
              return {
                label: v.name,
                description: `${v.exampleDevices.length} profiles`,
              } as vscode.QuickPickItem;
            })
            .valueSeq()
            .toArray();

          const selectedViewportName = await vscode.window.showQuickPick(
            viewportProfiles
          );

          if (selectedViewportName) {
            const newViewportProfile = getViewportProfiles().find(
              (v) => v.name === selectedViewportName.label
            );

            const viewports = newViewportProfile?.exampleDevices.map((d) => {
              return {
                label: d.name,
              } as vscode.QuickPickItem;
            });

            if (viewports) {
              const selectedNewViewport = await vscode.window.showQuickPick(
                viewports
              );
              const newViewport = newViewportProfile?.exampleDevices.find(
                (d) => d.name === selectedNewViewport?.label
              );
              if (newViewport) {
                aplConfiguration.viewport = newViewport;
                webView.webview.postMessage({
                  document: JSON.stringify(
                    aplConfiguration.aplPayload.document
                  ),
                  datasources: JSON.stringify(
                    aplConfiguration.aplPayload.datasources
                  ),
                  viewport: JSON.stringify(
                    viewportCharacteristicsFromViewPort(newViewport)
                  ),
                });
                statusBarItem.text = selectedViewportName.label;
              }
            }
          }
        }
      );
      const statusBarItem = vscode.window.createStatusBarItem();
      statusBarItem.command =
        "alexa-presentation-language-preview.selectViewports";
      statusBarItem.name = "Select Viewport Profile";
      statusBarItem.text = getDefaultViewport().name;
      statusBarItem.show();

      webView.webview.html = buildPreviewHtml(
        aplPreviewJsUrl.toString(),
        viewhostWebJsUrl.toString()
      );
      webView.webview.onDidReceiveMessage(
        (message) => {
          switch (message.command) {
            case "initialize":
              const currentDocument = textEditor?.document;
              if (currentDocument) {
                aplConfiguration.aplPayload = JSON.parse(
                  currentDocument.getText()
                );

                webView.webview.postMessage({
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

            webView.webview.postMessage({
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

function dpToPixel(dp: number, dpi: number): number {
  return Math.round((dpi / 160) * dp);
}

// viewport in apl-viewhost-web must be IViewportCharacteristics type.
// This method is to convert IViewportCharacteristics from IViewport
// https://github.com/alexa/apl-viewhost-web/blob/master/js/apl-html/src/APLRenderer.ts#L60
function viewportCharacteristicsFromViewPort(targetViewport: IViewport): any {
  return {
    isRound: targetViewport.shape === ViewportShape.ROUND,
    height: dpToPixel(targetViewport.height, targetViewport.dpi),
    width: dpToPixel(targetViewport.width, targetViewport.dpi),
    dpi: targetViewport.dpi,
  };
}

export function deactivate() {}
