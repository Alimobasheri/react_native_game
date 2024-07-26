import EventEmitter from "react-native/Libraries/vendor/emitter/EventEmitter";
import { uid } from "./Entity";

export class EventDispatcher extends EventEmitter {
  private _subscribersToAllEvents: Map<string, (data: any) => void> = new Map<
    string,
    (data: any) => void
  >();
  public emitEvent(event: string, data?: any) {
    this.emit(event, data);
    for (const [_, callback] of this._subscribersToAllEvents) {
      callback(data);
    }
  }

  public addListenerToAllEvents(callback: (data: any) => void): string {
    const id = uid();
    this._subscribersToAllEvents.set(id, callback);

    return id;
  }

  public removeListenerToAllEvents(id: string) {
    this._subscribersToAllEvents.delete(id);
  }
}
