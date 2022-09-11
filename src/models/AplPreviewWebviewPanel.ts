import { AplPayloadRepository } from "./../repositories/AplPayloadRepository";
import {
  aplPayloadUpdateEventEmitter,
  aplViewportUpdateEventEmitter,
} from "./../utils/eventEmitters";
import { AplDocumentTreeView } from "./../views/AplDocumentTreeView";
import { LocalPackageImportError } from "./../utils/exceptions";
import { AplConfiguration, AplPayload } from "./AplConfiguration";
import * as vscode from "vscode";
import { buildPreviewHtml } from "../utils/buildPreviewHtml";
import { viewportCharacteristicsFromViewPort } from "../utils/viewportCharacteristicsFromViewPort";
import * as path from "node:path";
import { AplComponentDetailsTreeView } from "../views/AplComponentDetailsTreeView";
import * as jsonlint from "jsonlint-pos";
jsonlint.parser.setPosEnabled(true);
import * as fs from "fs";

export class AplPreviewWebviewPanel {
  // TODO Replace it by primitive apl payload and viewport because now can take both
  // from EventEmitter.
  // Now this class needs `setAndInflateAplPayload` in it but I can extract this feature as `LocalPackageImporter` class
  aplConfiguration: AplConfiguration;
  // 可能なら AplPreviewWebviewPanel と aplTextEditor の状態を管理するクラスを用意した方が良さそう
  // AplPreviewWebviewPanel はパネル生成時にアクティブなテキストエディタのみに連動させたいが、可能なら直接依存する形でエディタの状態を監視させたい
  aplTextEditor: vscode.TextEditor;
  webviewPanel: vscode.WebviewPanel;

  constructor(
    extensionContext: vscode.ExtensionContext,
    aplTextEditor: vscode.TextEditor,
    aplConfiguration?: AplConfiguration
  ) {
    this.aplConfiguration = aplConfiguration
      ? aplConfiguration
      : new AplConfiguration();
    this.aplTextEditor = aplTextEditor;
    this.webviewPanel = this.configureWebviewPanel(extensionContext);
    this.configureDidReceiveMessageCallback(extensionContext);

    aplPayloadUpdateEventEmitter.event((aplPayload) => {
      this.updateAplPayload(aplPayload);
      this.updateAplPreview();
    });

    aplViewportUpdateEventEmitter.event((viewport) => {
      this.aplConfiguration.viewport = viewport;
      this.updateAplPreview();
    });
  }

  updateAplPayload(aplPayload: AplPayload) {
    const documentDirPath = path.dirname(this.aplTextEditor.document.uri.path);
    try {
      this.aplConfiguration.setAndInflateAplPayload(
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

              // TODO Move AplDocumentTreeView configurations to other places
              const aplDocumentTreeView = new AplDocumentTreeView(
                extensionContext
              );
              vscode.window.registerTreeDataProvider(
                "aplDocumentTree",
                aplDocumentTreeView
              );
              vscode.window.createTreeView("aplDocumentTree", {
                treeDataProvider: aplDocumentTreeView,
              });

              // TODO Move AplComponentDetailsTreeView configurations to other places
              // TODO Update content when save json
              const aplComponentDetailsTreeView =
                new AplComponentDetailsTreeView(extensionContext, {});
              vscode.window.registerTreeDataProvider(
                "aplComponentDetailsTree",
                aplComponentDetailsTreeView
              );
              vscode.window.createTreeView("aplComponentDetailsTree", {
                treeDataProvider: aplComponentDetailsTreeView,
              });

              const refreshAplComponentDetailsTreeViewDisposable =
                vscode.commands.registerCommand(
                  "alexa-presentation-language-preview.updateAplComponentDetailsTree",
                  async (
                    aplComponentProperty,
                    aplComponentJsonPath: string
                  ) => {
                    aplComponentDetailsTreeView.updateAplProperty(
                      aplComponentProperty
                    );

                    const aplDocumentJson = fs.readFileSync(
                      this.aplTextEditor.document.uri.path,
                      "utf8"
                    );

                    if (!aplDocumentJson) {
                      return;
                    }

                    // Use text from file instead of using apl document in AplConfiguration
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
