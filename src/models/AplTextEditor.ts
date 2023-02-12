import * as vscode from "vscode";
import * as jsonlint from "jsonlint-pos";
jsonlint.parser.setPosEnabled(true);
import * as fs from "fs";
import {
  parseTree,
  getLocation,
  findNodeAtLocation,
  getNodeValue,
} from "jsonc-parser";
import * as AplSuggestor from "apl-suggester";
import {
  AplPayload,
  AplPayloadRepository,
} from "../repositories/AplPayloadRepository";

export class AplTextEditor {
  completionProvider?: vscode.Disposable;

  constructor(
    private editor: vscode.TextEditor,
    private extensionContext: vscode.ExtensionContext
  ) {
    this.registerCompletion(this.extensionContext);
  }

  get documentUri(): string {
    return this.editor.document.uri.path;
  }

  get documentText(): string {
    return this.editor?.document.getText();
  }

  // TODO: Refactor logic in registerCompletion. It should be implemented about builing logic outside of this function.
  registerCompletion(extensionContext: vscode.ExtensionContext) {
    const provider = vscode.languages.registerCompletionItemProvider(
      { language: "json", pattern: this.documentUri },
      {
        async provideCompletionItems(
          document: vscode.TextDocument,
          position: vscode.Position
        ) {
          const tree = parseTree(document.getText());
          if (!tree) {
            return;
          }

          // Get component type and property name of the current location.
          const currentOffsetInDocument = document.offsetAt(position);
          const jsonNodePath = getLocation(
            document.getText(),
            currentOffsetInDocument
          ).path;
          const propertyName = jsonNodePath[jsonNodePath.length - 1];
          const parentPath = jsonNodePath.slice(0, jsonNodePath.length - 1);

          const node = findNodeAtLocation(tree, parentPath);
          if (!node) {
            return;
          }
          const componentType = getNodeValue(node).type;

          // Get APL component schema of the current component
          // If propertyName is empty, it should be invalid format JSON as like below.
          // {
          //   "text": "hoge",
          //   "" <-
          // }
          // So fetch it from AplPayloadRepository that stores valid format one.
          const aplPayload: AplPayload =
            propertyName === ""
              ? await new AplPayloadRepository(extensionContext).get()
              : JSON.parse(document.getText());
          const componentSchema =
            await AplSuggestor.ComponentSchemaController.getInstance().getComponentSchema(
              aplPayload,
              componentType
            );

          // Return values that is valid in the property
          if (propertyName === "type") {
            return buildComponentTypeItem(aplPayload);
          }

          if (!componentSchema.properties) {
            return;
          }

          if (propertyName === "") {
            // Return property names of the component
            const existingPropertyNames = Object.keys(getNodeValue(node));
            return Object.keys(componentSchema.properties)
              .filter((name) => !existingPropertyNames.includes(name))
              .map(
                (name) =>
                  new vscode.CompletionItem(
                    name,
                    vscode.CompletionItemKind.Enum
                  )
              );
          } else {
            if (propertyName === "style") {
              // Return style names in the document
              const styles = aplPayload.document.styles;
              if (!styles) {
                return;
              }

              return Object.keys(styles).map(
                (s) =>
                  new vscode.CompletionItem(s, vscode.CompletionItemKind.Enum)
              );
            } else {
              // Return valid values of the property
              const propertyValues =
                componentSchema.properties?.[propertyName].enum;

              if (propertyValues) {
                return propertyValues.map(
                  (p: string) =>
                    new vscode.CompletionItem(p, vscode.CompletionItemKind.Enum)
                );
              }
            }
          }
        },
      },
      '"'
    );

    this.completionProvider = provider;
    extensionContext.subscriptions.push(provider);
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

async function buildComponentTypeItem(aplPayload: AplPayload) {
  // Return values that is valid in the property
  const availableComponents =
    await AplSuggestor.ComponentSchemaController.getInstance().getAvailableComponents(
      aplPayload
    );
  const layouts = aplPayload.document.layouts;
  const candidates = layouts
    ? availableComponents.concat(Object.keys(layouts))
    : availableComponents;

  return candidates.map(
    (p) => new vscode.CompletionItem(p, vscode.CompletionItemKind.Enum)
  );
}
