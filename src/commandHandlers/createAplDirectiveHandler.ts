import * as vscode from "vscode";
const templateDirectiveJson = require("../../assets/template-directive.json");

export async function createAplDirectiveHandler() {
  const editorViewColumn = vscode.ViewColumn.Active
    ? vscode.ViewColumn.Active
    : vscode.ViewColumn.One;

  const document = await vscode.workspace.openTextDocument();
  const editor = await vscode.window.showTextDocument(
    document,
    editorViewColumn
  );

  editor.edit((editBuilder) => {
    editBuilder.insert(
      new vscode.Position(0, 0),
      JSON.stringify(templateDirectiveJson, null, 4)
    );
  });
}
