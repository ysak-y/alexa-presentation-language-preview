import { IViewport, getDefaultViewport } from "apl-suggester";

type JsonValue =
  | string
  | number
  | boolean
  | JsonValue[]
  | { [key: string]: JsonValue }
  | null;

interface AplPayload {
  document: JsonValue;
  datasources: JsonValue;
}

export class AplConfiguration {
  viewport: IViewport;
  aplPayload: AplPayload;

  constructor(aplPayload?: AplPayload, viewport?: IViewport) {
    this.viewport = viewport ? viewport : getDefaultViewport();
    this.aplPayload = aplPayload
      ? aplPayload
      : { document: {}, datasources: {} };
  }
}
