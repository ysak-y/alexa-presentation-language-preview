import { AplConfiguration } from "./AplConfiguration";
import * as vscode from "vscode";
import { buildPreviewHtml } from "../utils/buildPreviewHtml";
import { viewportCharacteristicsFromViewPort } from "../utils/viewportCharacteristicsFromViewPort";

export class AplPreviewWebviewPanel {
  aplConfiguration: AplConfiguration;
  webviewPanel: vscode.WebviewPanel;

  constructor(
    extensionContext: vscode.ExtensionContext,
    aplConfiguration?: AplConfiguration
  ) {
    this.aplConfiguration = aplConfiguration
      ? aplConfiguration
      : new AplConfiguration();
    this.webviewPanel = this.configureWebviewPanel(extensionContext);
    this.configureDidReceiveMessageCallback(extensionContext);
  }

  updateAplPreview() {
    this.webviewPanel.webview.postMessage({
      document: JSON.stringify(this.aplConfiguration.aplPayload.document),
      datasources: JSON.stringify(this.aplConfiguration.aplPayload.datasources),
      viewport: JSON.stringify(
        viewportCharacteristicsFromViewPort(this.aplConfiguration.viewport)
      ),
    });
  }

  private configureWebviewPanel(extensionContext: vscode.ExtensionContext) {
    const webviewPanel = vscode.window.createWebviewPanel(
      "aplView",
      "APL Preview",
      {
        viewColumn: vscode.ViewColumn.Beside,
      },
      {
        enableScripts: true,
      }
    );
    const aplPreviewJsLocation = vscode.Uri.joinPath(
      extensionContext.extensionUri,
      "assets/aplPreview.js"
    );
    const viewhostWebLocation = vscode.Uri.joinPath(
      extensionContext.extensionUri,
      "/node_modules/apl-viewhost-web/index.js"
    );
    const aplPreviewJsUrl =
      webviewPanel.webview.asWebviewUri(aplPreviewJsLocation);
    const viewhostWebJsUrl =
      webviewPanel.webview.asWebviewUri(viewhostWebLocation);

    webviewPanel.webview.html = buildPreviewHtml(
      aplPreviewJsUrl.toString(),
      viewhostWebJsUrl.toString()
    );

    return webviewPanel;
  }

  private configureDidReceiveMessageCallback(
    extensionContext: vscode.ExtensionContext
  ) {
    this.webviewPanel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.command) {
          case "initialize":
            const currentDocument = vscode.window.activeTextEditor?.document;
            if (currentDocument) {
              this.aplConfiguration.aplPayload = JSON.parse(
                currentDocument.getText()
              );
              this.updateAplPreview();
            }
            return;
          case "alert":
            vscode.window.showErrorMessage(message.text);
            return;
        }
      },
      undefined,
      extensionContext.subscriptions
    );
  }
}
