export function buildPreviewHtml(
  aplPreviewPath: string,
  aplWebviewHostPath: string
) {
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
