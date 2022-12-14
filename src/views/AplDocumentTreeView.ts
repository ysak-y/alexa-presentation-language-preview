import { aplPayloadUpdateEventEmitter } from "./../utils/eventEmitters";
import * as vscode from "vscode";
import { JsonType } from "../utils/JsonUtils";
import { AplPayloadRepository } from "../repositories/AplPayloadRepository";

export class AplDocumentTreeView
  implements vscode.TreeDataProvider<AplComponent>
{
  constructor(private extensionContext: vscode.ExtensionContext) {
    aplPayloadUpdateEventEmitter.event(() => {
      this.refresh();
    });
  }

  getTreeItem(element: AplComponent): vscode.TreeItem {
    return element;
  }

  getChildren(element?: AplComponent): Thenable<AplComponent[]> {
    if (element) {
      const componentAndPropertyName = this.getItemsFromComponents(
        element.properties
      );

      if (!componentAndPropertyName) {
        return Promise.resolve([]);
      }

      const isItemArray = Array.isArray(componentAndPropertyName.items);
      const items = this.wrapWithArrayIfObject(componentAndPropertyName.items);

      const childComponents: AplComponent[] = items
        ? items.map((c: JsonType, idx: number) => {
            const label = (c["id"] ? c["id"] : c["type"]) as string;
            const childComponentItems = this.getItemsFromComponents(c);
            const collapsibleState = childComponentItems?.items
              ? vscode.TreeItemCollapsibleState.Expanded
              : vscode.TreeItemCollapsibleState.None;

            let path = `${element.path}/${componentAndPropertyName.propertyName}`;
            if (isItemArray) {
              path += `/${idx}`;
            }
            return new AplComponent(label, c, collapsibleState, path);
          })
        : [];
      return Promise.resolve(childComponents);
    } else {
      const aplPayload = new AplPayloadRepository(this.extensionContext).get();
      const mainTemplate = aplPayload.document["mainTemplate"] as JsonType;
      if (mainTemplate) {
        const collapsibleState =
          mainTemplate.length === 0
            ? vscode.TreeItemCollapsibleState.None
            : vscode.TreeItemCollapsibleState.Expanded;
        return Promise.resolve([
          new AplComponent(
            "mainTemplate",
            mainTemplate,
            collapsibleState,
            "mainTemplate"
          ),
        ]);
      } else {
        return Promise.resolve([]);
      }
    }
  }

  private _onDidChangeTreeData: vscode.EventEmitter<
    AplComponent | undefined | null | void
  > = new vscode.EventEmitter<AplComponent | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    AplComponent | undefined | null | void
  > = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  private getItemsFromComponents(aplComponent: JsonType):
    | {
        propertyName: string;
        items: JsonType[] | JsonType;
      }
    | undefined {
    const itemsValue = aplComponent["items"];
    if (itemsValue) {
      return {
        items: itemsValue as JsonType,
        propertyName: "items",
      };
    }

    const itemValue = aplComponent["item"];
    if (itemValue) {
      return {
        items: itemValue as JsonType,
        propertyName: "item",
      };
    }
  }

  private wrapWithArrayIfObject(
    val: JsonType[] | Object
  ): JsonType[] | undefined {
    if (Array.isArray(val)) {
      return val;
    } else if (typeof val === "object") {
      return [val as JsonType];
    }
  }
}

class AplComponent extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public properties: JsonType,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly path: string
  ) {
    super(label, collapsibleState);
    this.command = {
      arguments: [properties, path],
      command:
        "alexa-presentation-language-preview.updateAplComponentDetailsTree",
      title: "APL Component details",
      tooltip: "Show component detail in APL Component details view",
    };
  }
}
