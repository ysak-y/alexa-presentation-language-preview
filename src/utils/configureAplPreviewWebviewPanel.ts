import * as vscode from "vscode";
import { buildPreviewHtml } from "./buildPreviewHtml";

export function configureAplPreviewWebviewPanel(
  context: vscode.ExtensionContext
): vscode.WebviewPanel {
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
  const aplPreviewJsLocation = vscode.Uri.joinPath(
    context.extensionUri,
    "assets/aplPreview.js"
  );
  const viewhostWebLocation = vscode.Uri.joinPath(
    context.extensionUri,
    "/node_modules/apl-viewhost-web/index.js"
  );
  const aplPreviewJsUrl = webView.webview.asWebviewUri(aplPreviewJsLocation);
  const viewhostWebJsUrl = webView.webview.asWebviewUri(viewhostWebLocation);

  webView.webview.html = buildPreviewHtml(
    aplPreviewJsUrl.toString(),
    viewhostWebJsUrl.toString()
  );

  return webView;
}
