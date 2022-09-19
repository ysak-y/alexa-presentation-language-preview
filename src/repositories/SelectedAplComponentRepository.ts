import { selectedAplComponentUpdateEmitter } from "./../utils/eventEmitters";
import { ExtensionContext, Memento } from "vscode";
import { JsonType } from "../utils/JsonUtils";

const DATA_STORE_KEY = "_selectedAplComponentRepository";

export interface SelectedAplComponent {
  path?: string;
  properties: JsonType;
}

export class SelectedAplComponentRepository {
  dataStore: Memento;

  constructor(context: ExtensionContext) {
    this.dataStore = context.globalState;
  }

  async create() {
    const newSelectedAplComponent: SelectedAplComponent = {
      properties: {},
    };

    await this.dataStore.update(DATA_STORE_KEY, newSelectedAplComponent);
  }

  get() {
    return this.dataStore.get(DATA_STORE_KEY) as SelectedAplComponent;
  }

  async update(selectedAplComponent: SelectedAplComponent) {
    await this.dataStore.update(DATA_STORE_KEY, selectedAplComponent);
    selectedAplComponentUpdateEmitter.fire(selectedAplComponent);
  }
}
