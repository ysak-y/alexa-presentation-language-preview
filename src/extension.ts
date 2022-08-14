import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "alexa-presentation-language-preview" is now active!'
  );

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    "alexa-presentation-language-preview.helloWorld",
    () => {
      const webView = vscode.window.createWebviewPanel(
        "aplView",
        "APL Preview",
        {
          viewColumn: vscode.ViewColumn.Beside,
        }
      );
      webView.webview.html = "<html><div>Hello World</div></html>";

      vscode.workspace.onDidSaveTextDocument((document) => {
        webView.webview.html = `<html><div>${document.getText()}</div></html>`;
      });
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
