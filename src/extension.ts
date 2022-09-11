import { AplViewportRepository } from "./repositories/AplViewportRepository";
import { AplPayloadRepository } from "./repositories/AplPayloadRepository";
import { AplPreviewWebviewPanel } from "./models/AplPreviewWebviewPanel";
import * as vscode from "vscode";
import { getDefaultViewport, getViewportProfiles } from "apl-suggester";
import { createAplDirectiveHandler } from "./commandHandlers/createAplDirectiveHandler";
import {
  aplViewportUpdateEventEmitter,
  selectedViewportNameUpdateEventEmitter,
} from "./utils/eventEmitters";

function buildViewportStatusBarItem(): vscode.StatusBarItem {
  const statusBarItem = vscode.window.createStatusBarItem();
  statusBarItem.command = "alexa-presentation-language-preview.selectViewport";
  statusBarItem.name = "Select Viewport Profile";
  statusBarItem.text = getDefaultViewport().name;
  statusBarItem.show();
  selectedViewportNameUpdateEventEmitter.event(
    (selectedViewportProfileName) => {
      statusBarItem.text = selectedViewportProfileName.label;
    }
  );

  return statusBarItem;
}

export async function activate(context: vscode.ExtensionContext) {
  const statusBarItem = buildViewportStatusBarItem();
  await new AplPayloadRepository(context).create();
  await new AplViewportRepository(context).create();

  const aplDirectiveDisposable = vscode.commands.registerCommand(
    "alexa-presentation-language-preview.createAplDirective",
    createAplDirectiveHandler
  );
  context.subscriptions.push(aplDirectiveDisposable);

  let aplEditor: vscode.TextEditor | undefined;
  let aplPreviewWebviewPanel: AplPreviewWebviewPanel | undefined;

  let disposable = vscode.commands.registerCommand(
    "alexa-presentation-language-preview.previewApl",
    () => {
      aplEditor = vscode.window.activeTextEditor;
      if (!aplEditor) {
        vscode.window.showInformationMessage(
          "You need to focus the text window at first when execute this command"
        );
        return;
      }

      if (aplEditor.document.isUntitled === true) {
        vscode.window.showInformationMessage(
          "Please save the file before previewing APL"
        );
        return;
      }

      aplPreviewWebviewPanel = new AplPreviewWebviewPanel(context, aplEditor);
      aplPreviewWebviewPanel.webviewPanel.onDidDispose(
        () => {
          aplPreviewWebviewPanel = undefined;
          statusBarItem.dispose();
          selectViewportDisposable.dispose();
        },
        null,
        context.subscriptions
      );
    }
  );

  vscode.workspace.onDidCloseTextDocument((document) => {
    if (document.uri === aplEditor?.document.uri) {
      aplPreviewWebviewPanel?.webviewPanel.dispose();
      aplPreviewWebviewPanel = undefined;
      statusBarItem.dispose();
      selectViewportDisposable.dispose();
      aplEditor = undefined;
    }
  });

  vscode.workspace.onDidSaveTextDocument(async (document) => {
    if (document.uri === aplEditor?.document.uri && aplPreviewWebviewPanel) {
      await new AplPayloadRepository(context).update(
        JSON.parse(document.getText())
      );
    }
  });

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

      const selectedViewportName = await vscode.window.showQuickPick(viewports);
      const newViewport = selectedViewportProfile?.exampleDevices.find(
        (d) => d.name === selectedViewportName?.label
      );

      if (!newViewport) {
        return;
      }

      aplViewportUpdateEventEmitter.fire(newViewport);
      selectedViewportNameUpdateEventEmitter.fire(selectedViewportProfileName);
    }
  );
  context.subscriptions.push(selectViewportDisposable);
  context.subscriptions.push(disposable);
}

export function deactivate() {}
