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
import * as jsonlint from "jsonlint-pos";
jsonlint.parser.setPosEnabled(true);
import * as fs from "fs";
import { AplViewportRepository } from "../repositories/AplViewportRepository";

export class AplPreviewWebviewPanel {
  // 可能なら AplPreviewWebviewPanel と aplTextEditor の状態を管理するクラスを用意した方が良さそう
  // AplPreviewWebviewPanel はパネル生成時にアクティブなテキストエディタのみに連動させたいが、可能なら直接依存する形でエディタの状態を監視させたい
  aplTextEditor: vscode.TextEditor;
  webviewPanel: vscode.WebviewPanel;
  viewport: IViewport;
  aplPayload: AplPayload;

  constructor(
    extensionContext: vscode.ExtensionContext,
    aplTextEditor: vscode.TextEditor
  ) {
    this.aplTextEditor = aplTextEditor;
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
    const documentDirPath = path.dirname(this.aplTextEditor.document.uri.path);
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
            const currentDocument = this.aplTextEditor.document;
            if (currentDocument) {
              await new AplPayloadRepository(extensionContext).update(
                JSON.parse(currentDocument.getText())
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

                    const aplDocumentJson = fs.readFileSync(
                      this.aplTextEditor.document.uri.path,
                      "utf8"
                    );

                    if (!aplDocumentJson) {
                      return;
                    }

                    // Use text from file instead of using apl document of this class
                    // because JSON.stringify() would produce some differences from original texts
                    const parsedJson =
                      jsonlint.parser.parse(aplDocumentJson)["document"];

                    let jsonValue = parsedJson;
                    const pathArray = aplComponentJsonPath.split("/");
                    pathArray.forEach((a, idx) => {
                      if (idx !== pathArray.length - 1) {
                        jsonValue = jsonValue[a];
                      }
                    });
                    if (jsonValue) {
                      const position: jsonlint.Position =
                        jsonValue["_pos"][
                          `_${pathArray[pathArray.length - 1]}`
                        ];

                      const startPos = new vscode.Position(
                        position.first_line - 1,
                        0
                      );
                      const endPos = new vscode.Position(position.last_line, 0);
                      const targetComponentRange = new vscode.Range(
                        startPos,
                        endPos
                      );
                      this.aplTextEditor.revealRange(targetComponentRange);

                      // Blink background with highlight color to notify
                      // the place of the selected component
                      const decorationType =
                        vscode.window.createTextEditorDecorationType({
                          backgroundColor: new vscode.ThemeColor(
                            "editor.selectionHighlightBackground"
                          ),
                        });

                      this.aplTextEditor.setDecorations(decorationType, [
                        targetComponentRange,
                      ]);

                      setTimeout(() => {
                        this.aplTextEditor.setDecorations(decorationType, []);
                      }, 1000);
                    }
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
