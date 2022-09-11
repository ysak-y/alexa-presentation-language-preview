import { AplPreviewWebviewPanel } from "./models/AplPreviewWebviewPanel";
import * as vscode from "vscode";
import { getDefaultViewport, getViewportProfiles } from "apl-suggester";
import { createAplDirectiveHandler } from "./commandHandlers/createAplDirectiveHandler";

function buildViewportStatusBarItem(): vscode.StatusBarItem {
  const statusBarItem = vscode.window.createStatusBarItem();
  statusBarItem.command = "alexa-presentation-language-preview.selectViewport";
  statusBarItem.name = "Select Viewport Profile";
  statusBarItem.text = getDefaultViewport().name;
  statusBarItem.show();

  return statusBarItem;
}

export function activate(context: vscode.ExtensionContext) {
  const statusBarItem = buildViewportStatusBarItem();

  const aplDirectiveDisposable = vscode.commands.registerCommand(
    "alexa-presentation-language-preview.createAplDirective",
    createAplDirectiveHandler
  );
  context.subscriptions.push(aplDirectiveDisposable);

  let disposable = vscode.commands.registerCommand(
    "alexa-presentation-language-preview.previewApl",
    () => {
      let aplEditor = vscode.window.activeTextEditor;
      if (!aplEditor) {
        vscode.window.showInformationMessage(
          "You need to focus the text window at first when execute this command"
        );
        disposable.dispose();
        return;
      }

      if (aplEditor.document.isUntitled === true) {
        vscode.window.showInformationMessage(
          "Please save the file before previewing APL"
        );
        disposable.dispose();
        return;
      }

      let aplPreviewWebviewPanel: AplPreviewWebviewPanel | undefined =
        new AplPreviewWebviewPanel(context, aplEditor);

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
          if (aplPreviewWebviewPanel) {
            aplPreviewWebviewPanel.aplConfiguration.viewport = newViewport;
            aplPreviewWebviewPanel.updateAplPreview();
            statusBarItem.text = selectedViewportProfileName.label;
          }
        }
      );
      context.subscriptions.push(selectViewportDisposable);

      vscode.workspace.onDidCloseTextDocument((document) => {
        if (document.uri === aplEditor?.document.uri) {
          aplPreviewWebviewPanel?.webviewPanel.dispose();
          aplPreviewWebviewPanel = undefined;
          statusBarItem.dispose();
          selectViewportDisposable.dispose();
          aplEditor = undefined;
        }
      });

      aplPreviewWebviewPanel.webviewPanel.onDidDispose(
        () => {
          aplPreviewWebviewPanel = undefined;
          statusBarItem.dispose();
          selectViewportDisposable.dispose();
        },
        null,
        context.subscriptions
      );

      vscode.workspace.onDidSaveTextDocument((document) => {
        try {
          if (
            document.uri === aplEditor?.document.uri &&
            aplPreviewWebviewPanel
          ) {
            aplPreviewWebviewPanel.updateAplPayload(
              JSON.parse(document.getText())
            );
            aplPreviewWebviewPanel.updateAplPreview();
            vscode.commands.executeCommand(
              "alexa-presentation-language-preview.refreshAplDocumentTreeView"
            );
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
