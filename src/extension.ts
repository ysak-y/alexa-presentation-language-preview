import * as vscode from "vscode";
import { Uri } from "vscode";
import { getDefaultViewport, IViewport, ViewportShape } from "apl-suggester";

export function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "alexa-presentation-language-preview" is now active!'
  );

  let disposable = vscode.commands.registerCommand(
    "alexa-presentation-language-preview.helloWorld",
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

      webView.webview.html = buildHtml(aplPreviewJsUrl, viewhostWebJsUrl);

      vscode.workspace.onDidSaveTextDocument((document) => {
        try {
          const documentJson = JSON.parse(document.getText());

          webView.webview.postMessage({
            document: JSON.stringify(documentJson["document"]),
            datasources: JSON.stringify(documentJson["datasources"]),
            viewport: JSON.stringify(
              viewportCharacteristicsFromViewPort(getDefaultViewport())
            ),
          });
        } catch (e) {
          vscode.window.showInformationMessage("Your json seems to be invalid");
        }
      });
    }
  );

  context.subscriptions.push(disposable);
}

function buildHtml(aplPreviewPath: any, aplWebviewHostPath: any) {
  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta http-equiv="Content-Security-Policy"
      content="default-src https: data:; img-src https: data:; script-src vscode-resource: https: data: 'unsafe-inline' 'unsafe-eval'; style-src vscode-resource: 'unsafe-inline';" />
      <title>APL Preview</title>
      <script>window.AplRenderer || document.write('<script src="${aplWebviewHostPath}"><\\/script>')</script>
      <script src="${aplPreviewPath}"></script>
    </head>
    <style>
      body {
        font: 14px "Lucida Grande", Helvetica, Arial, sans-serif;
      }
      :focus {
        outline: none;
      }
    </style>
    <body>
     <div></div>
    </body>
  </html>`;
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
