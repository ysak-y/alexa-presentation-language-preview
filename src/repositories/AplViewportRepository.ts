import { IViewport, getDefaultViewport } from "apl-suggester";
import { ExtensionContext, Memento } from "vscode";
import { aplViewportUpdateEventEmitter } from "../utils/eventEmitters";

const DATA_STORE_KEY = "_aplViewport";

export class AplViewportRepository {
  dataStore: Memento;

  constructor(context: ExtensionContext) {
    this.dataStore = context.globalState;
  }

  async create() {
    await this.dataStore.update(DATA_STORE_KEY, getDefaultViewport());
  }

  get() {
    return this.dataStore.get(DATA_STORE_KEY) as IViewport;
  }

  async update(viewport: IViewport) {
    await this.dataStore.update(DATA_STORE_KEY, viewport);
    aplViewportUpdateEventEmitter.fire(viewport);
  }
}
