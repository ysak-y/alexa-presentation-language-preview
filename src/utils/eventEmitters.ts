import { IViewport } from "apl-suggester";
import { AplPayload } from "./../repositories/AplPayloadRepository";
import { EventEmitter, QuickPickItem } from "vscode";

export const aplPayloadUpdateEventEmitter: EventEmitter<AplPayload> =
  new EventEmitter<AplPayload>();
export const aplViewportUpdateEventEmitter: EventEmitter<IViewport> =
  new EventEmitter<IViewport>();
export const selectedViewportNameUpdateEventEmitter: EventEmitter<QuickPickItem> =
  new EventEmitter<QuickPickItem>();
