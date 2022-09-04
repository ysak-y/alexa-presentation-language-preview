import { JsonValue } from "./../utils/JsonUtils";
import { AplConfiguration } from "./../models/AplConfiguration";
import * as vscode from "vscode";
import { isJsonType, JsonType } from "../utils/JsonUtils";
import * as AplSuggestor from "apl-suggester";

export class AplComponentDetailsTreeView
  implements
    vscode.TreeDataProvider<
      AplComponentPropertyItem | AplComponentPropertyValueItem
    >
{
  constructor(
    private aplConfiguration: AplConfiguration,
    private componentProperties: JsonType
  ) {}

  getTreeItem(
    element: AplComponentPropertyItem | AplComponentPropertyValueItem
  ): vscode.TreeItem {
    return element;
  }

  getChildren(
    element?: AplComponentPropertyItem
  ): Thenable<AplComponentPropertyItem[] | AplComponentPropertyValueItem[]> {
    if (element) {
      if (element instanceof AplComponentPropertyItem) {
        return Promise.resolve([
          new AplComponentPropertyValueItem(
            element.value as string,
            vscode.TreeItemCollapsibleState.None
          ),
        ]);
      } else {
        return Promise.resolve([]);
      }
    } else {
      return this.buildRootElement();
    }
  }

  private async buildRootElement() {
    const componentType = this.componentProperties["type"];
    if (
      typeof componentType !== "string" ||
      !isJsonType(this.componentProperties)
    ) {
      return Promise.resolve([]);
    }

    const aplProperties = (
      await AplSuggestor.ComponentSchemaController.getInstance().getComponentSchema(
        this.aplConfiguration.aplPayload,
        componentType
      )
    )?.properties;

    // Merge properties and remove duplicates
    const properties = [
      ...new Set(
        Object.keys(this.componentProperties)
          .concat(aplProperties ? Object.keys(aplProperties) : [])
          .filter((p) => !["item", "items"].includes(p))
      ),
    ];

    return Promise.resolve(
      properties.map(
        (p) =>
          new AplComponentPropertyItem(
            p,
            this.componentProperties[p],
            this.componentProperties[p]
              ? vscode.TreeItemCollapsibleState.Expanded
              : vscode.TreeItemCollapsibleState.None,
            aplProperties ? aplProperties[p]?.description : ""
          )
      )
    );
  }

  private _onDidChangeTreeData: vscode.EventEmitter<
    AplComponentPropertyItem | undefined | null | void
  > = new vscode.EventEmitter<
    AplComponentPropertyItem | undefined | null | void
  >();
  readonly onDidChangeTreeData: vscode.Event<
    AplComponentPropertyItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  updateAplProperty(aplComponentProperty: JsonType): void {
    this.componentProperties = aplComponentProperty;
    this._onDidChangeTreeData.fire();
  }
}

class AplComponentPropertyValueItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
  }
}

class AplComponentPropertyItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly value: JsonValue,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly componentDescription?: string
  ) {
    super(label, collapsibleState);
    this.tooltip = componentDescription;
  }
}
