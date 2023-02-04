import {
  LocalPackageImporter,
  AplPayload,
} from "./../utils/LocalPackageImporter";
import { IViewport } from "apl-suggester";
import { SelectedAplComponentRepository } from "./../repositories/SelectedAplComponentRepository";
import { AplPayloadRepository } from "./../repositories/AplPayloadRepository";
import {
  aplPayloadUpdateEventEmitter,
  aplViewportUpdateEventEmitter,
} from "./../utils/eventEmitters";
import { LocalPackageImportError } from "./../utils/exceptions";
import * as vscode from "vscode";
import { buildPreviewHtml } from "../utils/buildPreviewHtml";
import { viewportCharacteristicsFromViewPort } from "../utils/viewportCharacteristicsFromViewPort";
import * as path from "node:path";
import { AplViewportRepository } from "../repositories/AplViewportRepository";
import { AplTextEditor } from "./AplTextEditor";

export class AplPreviewWebviewPanel {
  aplTextEditor: AplTextEditor;
  webviewPanel: vscode.WebviewPanel;
  viewport: IViewport;
  aplPayload: AplPayload;

  constructor(
    extensionContext: vscode.ExtensionContext,
    aplTextEditor: vscode.TextEditor
  ) {
    this.aplTextEditor = new AplTextEditor(aplTextEditor);
    this.webviewPanel = this.configureWebviewPanel(extensionContext);
    this.configureDidReceiveMessageCallback(extensionContext);
    this.aplPayload = new AplPayloadRepository(extensionContext).get();
    this.viewport = new AplViewportRepository(extensionContext).get();

    aplPayloadUpdateEventEmitter.event((aplPayload) => {
      this.updateAplPayload(aplPayload);
      this.updateAplPreview();
    });

    aplViewportUpdateEventEmitter.event((viewport) => {
      this.viewport = viewport;
      this.updateAplPreview();
    });
  }

  updateAplPayload(aplPayload: AplPayload) {
    const documentDirPath = path.dirname(this.aplTextEditor.documentUri);
    try {
      this.aplPayload = new LocalPackageImporter().inflateAplPayload(
        documentDirPath,
        aplPayload
      );
    } catch (e) {
      if (e instanceof LocalPackageImportError) {
        vscode.window.showInformationMessage(
          "Failed import local packages while updating APL json. It may because source path is invalid"
        );
      } else {
        vscode.window.showInformationMessage("Your APL json seems invalid.");
      }
    }
  }

  updateAplPreview() {
    this.webviewPanel.webview.postMessage({
      document: JSON.stringify(this.aplPayload.document),
      datasources: JSON.stringify(this.aplPayload.datasources),
      viewport: JSON.stringify(
        viewportCharacteristicsFromViewPort(this.viewport)
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

  private async configureDidReceiveMessageCallback(
    extensionContext: vscode.ExtensionContext
  ) {
    this.webviewPanel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case "initialize":
            const currentDocument = this.aplTextEditor.documentText;
            if (currentDocument) {
              await new AplPayloadRepository(extensionContext).update(
                JSON.parse(currentDocument)
              );

              const refreshAplComponentDetailsTreeViewDisposable =
                vscode.commands.registerCommand(
                  "alexa-presentation-language-preview.updateAplComponentDetailsTree",
                  async (
                    aplComponentProperty,
                    aplComponentJsonPath: string
                  ) => {
                    await new SelectedAplComponentRepository(
                      extensionContext
                    ).update({
                      path: aplComponentJsonPath,
                      properties: aplComponentProperty,
                    });

                    this.aplTextEditor.highlight(aplComponentJsonPath, 1000);
                  }
                );
              extensionContext.subscriptions.push(
                refreshAplComponentDetailsTreeViewDisposable
              );
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
