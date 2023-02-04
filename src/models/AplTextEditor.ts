import * as vscode from "vscode";
import * as jsonlint from "jsonlint-pos";
jsonlint.parser.setPosEnabled(true);
import * as fs from "fs";

export class AplTextEditor {
  constructor(private editor: vscode.TextEditor) {}

  get documentUri(): string {
    return this.editor.document.uri.path;
  }

  get documentText(): string {
    return this.editor?.document.getText();
  }

  highlight(aplComponentJsonPath: string, duration: number = 1000) {
    const aplDocumentJson = fs.readFileSync(this.documentUri, "utf8");
    if (!aplDocumentJson) {
      return;
    }
    // Use text from file instead of using apl document of this class
    // because JSON.stringify() would produce some differences from original texts
    const parsedJson = jsonlint.parser.parse(aplDocumentJson)["document"];
    let jsonValue = parsedJson;
    const pathArray = aplComponentJsonPath.split("/");
    pathArray.forEach((a, idx) => {
      if (idx !== pathArray.length - 1) {
        jsonValue = jsonValue[a];
      }
    });

    if (jsonValue) {
      const position: jsonlint.Position =
        jsonValue["_pos"][`_${pathArray[pathArray.length - 1]}`];
      const startPos = new vscode.Position(position.first_line - 1, 0);
      const endPos = new vscode.Position(position.last_line, 0);
      const targetComponentRange = new vscode.Range(startPos, endPos);
      this.editor.revealRange(targetComponentRange);

      const decorationType = vscode.window.createTextEditorDecorationType({
        backgroundColor: new vscode.ThemeColor(
          "editor.selectionHighlightBackground"
        ),
      });

      this.editor.setDecorations(decorationType, [targetComponentRange]);

      setTimeout(() => {
        this.editor.setDecorations(decorationType, []);
      }, duration);
    }
  }
}
