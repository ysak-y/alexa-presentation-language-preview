import { ExtensionContext, Memento } from "vscode";
import { aplPayloadUpdateEventEmitter } from "../utils/eventEmitters";
import { JsonType } from "../utils/JsonUtils";

const DATA_STORE_KEY = "_aplPayload";
export interface AplPayload {
  document: JsonType;
  datasources: JsonType;
}

export class AplPayloadRepository {
  dataStore: Memento;

  constructor(context: ExtensionContext) {
    this.dataStore = context.globalState;
  }

  async create() {
    await this.dataStore.update(DATA_STORE_KEY, {
      document: {},
      datasources: {},
    });
  }

  get() {
    return this.dataStore.get(DATA_STORE_KEY) as AplPayload;
  }

  async update(aplPayload: AplPayload) {
    await this.dataStore.update(DATA_STORE_KEY, aplPayload);
    aplPayloadUpdateEventEmitter.fire(aplPayload);
  }
}
