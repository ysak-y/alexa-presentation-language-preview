import { AplComponentDetailsTreeView } from "./views/AplComponentDetailsTreeView";
import { AplDocumentTreeView } from "./views/AplDocumentTreeView";
import { SelectedAplComponentRepository } from "./repositories/SelectedAplComponentRepository";
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

function buildAplDocumentTreeView(context: vscode.ExtensionContext) {
  const aplDocumentTreeView = new AplDocumentTreeView(context);
  vscode.window.registerTreeDataProvider(
    "aplDocumentTree",
    aplDocumentTreeView
  );
  vscode.window.createTreeView("aplDocumentTree", {
    treeDataProvider: aplDocumentTreeView,
  });
}

function buildAplComponentDetailsTreeView(context: vscode.ExtensionContext) {
  const aplComponentDetailsTreeView = new AplComponentDetailsTreeView(
    context,
    {}
  );
  vscode.window.registerTreeDataProvider(
    "aplComponentDetailsTree",
    aplComponentDetailsTreeView
  );
  vscode.window.createTreeView("aplComponentDetailsTree", {
    treeDataProvider: aplComponentDetailsTreeView,
  });
}

export async function activate(context: vscode.ExtensionContext) {
  const statusBarItem = buildViewportStatusBarItem();
  await new AplPayloadRepository(context).create();
  await new AplViewportRepository(context).create();
  buildAplDocumentTreeView(context);
  buildAplComponentDetailsTreeView(context);

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
      let parsedJson;
      try {
        parsedJson = JSON.parse(document.getText());
      } catch (e) {
        vscode.window.showInformationMessage(
          "Can't parse json. Please check whether your json file is valid"
        );
        return;
      }

      await new AplPayloadRepository(context).update(parsedJson);

      const selectedAplComponentRepository = new SelectedAplComponentRepository(
        context
      );
      const selectedAplComponent = selectedAplComponentRepository.get();
      const selectedAplComponentJsonPath = selectedAplComponent?.path;
      if (!selectedAplComponentJsonPath) {
        return;
      }

      let jsonValue = parsedJson["document"];
      const pathArray = selectedAplComponentJsonPath.split("/");
      pathArray.forEach((a) => {
        jsonValue = jsonValue[a];
      });

      if (jsonValue) {
        selectedAplComponentRepository.update({
          path: selectedAplComponentJsonPath,
          properties: jsonValue,
        });
      }
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
