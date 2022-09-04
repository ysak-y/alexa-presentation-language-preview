import { isJsonType, JsonValue } from "./../utils/JsonUtils";
import * as vscode from "vscode";
import { JsonType } from "../utils/JsonUtils";
import { AplConfiguration } from "../models/AplConfiguration";
import * as AplSuggestor from "apl-suggester";

export class AplDocumentTreeView
  implements vscode.TreeDataProvider<AplPropertyItem | AplComponentItem>
{
  constructor(private aplConfiguration: AplConfiguration) {}

  getTreeItem(element: AplPropertyItem | AplComponentItem): vscode.TreeItem {
    return element;
  }

  getChildren(
    element?: AplPropertyItem | AplComponentItem
  ): Thenable<AplPropertyItem[] | AplComponentItem[]> {
    if (!element) {
      return this.buildRootItem();
    }

    if (element instanceof AplPropertyItem) {
      // element が text や width などのプロパティの時
      if (
        ["items", "item"].includes(element.label) &&
        element.value &&
        Array.isArray(element.value)
      ) {
        const filteredArray: JsonType[] = element.value.filter((v) =>
          isJsonType(v)
        ) as JsonType[];

        const childComponents: AplComponentItem[] = filteredArray.map(
          (c: JsonType) => {
            const label = c["type"] as string;
            delete c["type"];
            return new AplComponentItem(
              label,
              vscode.TreeItemCollapsibleState.None,
              c
            );
          }
        );
        return Promise.resolve(childComponents);
      } else {
        return Promise.resolve([]);
      }
    } else if (element instanceof AplComponentItem) {
      // element が Text や Container などのコンポーネントの時
      return AplSuggestor.ComponentSchemaController.getInstance()
        .getComponentSchema(this.aplConfiguration.aplPayload, element.label)
        .then((componentProperties) => {
          const elementPropertyKeys = element.properties
            ? Object.keys(element.properties)
            : [];

          const mergedPropertyKeys = elementPropertyKeys.concat(
            Object.keys(
              componentProperties?.properties
                ? componentProperties.properties
                : {}
            )
          );

          const childComponents = mergedPropertyKeys.map((c) => {
            return new AplPropertyItem(
              c,
              vscode.TreeItemCollapsibleState.None,
              element.properties[c]
            );
          });
          return Promise.resolve(childComponents);
        });
    } else {
      return this.buildRootItem();
    }
  }

  private async buildRootItem(): Promise<AplComponentItem[]> {
    const mainTemplate =
      this.aplConfiguration.aplPayload.document["mainTemplate"];

    if (!mainTemplate) {
      return Promise.resolve([]);
    }

    const collapsibleState =
      Object.keys(mainTemplate).length === 0
        ? vscode.TreeItemCollapsibleState.None
        : vscode.TreeItemCollapsibleState.Expanded;

    return Promise.resolve([
      new AplComponentItem(
        "mainTemplate",
        collapsibleState,
        mainTemplate as JsonType
      ),
    ]);
  }

  private _onDidChangeTreeData: vscode.EventEmitter<
    AplComponentItem | AplPropertyItem | undefined | null | void
  > = new vscode.EventEmitter<
    AplComponentItem | AplPropertyItem | undefined | null | void
  >();
  readonly onDidChangeTreeData: vscode.Event<
    AplComponentItem | AplPropertyItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  //private getItemsFromComponents(aplComponent: JsonType) {
  //  let items: JsonType[] = [];
  //  const itemsValue = this.wrapWithArrayIfObject(aplComponent["items"]);
  //  if (itemsValue) {
  //    items = items.concat(itemsValue);
  //  }

  //  const itemValue = this.wrapWithArrayIfObject(aplComponent["item"]);
  //  if (itemValue) {
  //    items = items.concat(itemValue);
  //  }

  //  return items;
  //}

  //private wrapWithArrayIfObject(
  //  val: JsonType[] | Object
  //): JsonType[] | undefined {
  //  if (Array.isArray(val)) {
  //    return val;
  //  } else if (typeof val === "object") {
  //    return [val as JsonType];
  //  }
  //}
}

class AplPropertyItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly value: JsonValue | null
  ) {
    super(label, collapsibleState);
  }
}

class AplComponentItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly properties: JsonType
  ) {
    super(label, collapsibleState);
  }
}
