import EventEmitter, {
  EmitterSubscription,
} from 'react-native/Libraries/vendor/emitter/EventEmitter';
import { uid } from './Entity';

/**
 * A global event dispatcher for the game engine, allowing events to be emitted and listened to from any part of the game.
 * This class extends `EventEmitter` and provides additional functionality for managing global event listeners,
 * making it possible to handle game-wide events seamlessly.
 *
 * @extends EventEmitter
 */
export class EventDispatcher extends EventEmitter {
  /**
   * A map of subscriber IDs to callback functions for listeners that subscribe to all events.
   * This allows any part of the game to respond to global events.
   *
   * @type {Map<string, (data: any) => void>}
   * @private
   */
  private _subscribersToAllEvents: Map<string, (data: any) => void> = new Map<
    string,
    (data: any) => void
  >();

  /**
   * Emits a global event to all listeners subscribed to the specific event and to those subscribed to all events.
   * This method allows events to be dispatched from any part of the game and received by any other part.
   *
   * @param {string} event - The name of the event to emit.
   * @param {any} [data] - Optional data to pass to the event listeners.
   */
  public emitEvent(event: string, data?: any) {
    this.emit(event, data);
    for (const [_, callback] of this._subscribersToAllEvents) {
      callback(data);
    }
  }

  /**
   * Adds a listener that will be called whenever any event is emitted within the game.
   * This allows for global event handling, where a single listener can respond to all events.
   *
   * @param {(data: any) => void} callback - The callback function to execute when any event is emitted.
   * @returns {string} The unique ID of the listener, which can be used to remove the listener later.
   */
  public addListenerToAllEvents(callback: (data: any) => void): string {
    const id = uid();
    this._subscribersToAllEvents.set(id, callback);
    return id;
  }

  /**
   * Removes a listener that was subscribed to all events, based on its unique ID.
   * This allows for precise control over global event listeners within the game.
   *
   * @param {string} id - The unique ID of the listener to remove.
   */
  public removeListenerToAllEvents(id: string) {
    this._subscribersToAllEvents.delete(id);
  }

  /**
   * Adds a listener for a specific event.
   * This wraps the `EventEmitter`'s `addListener` method and returns an EmitterSubscription.
   *
   * @param {string} event - The name of the event to listen to.
   * @param {(data: any) => void} listener - The callback function to execute when the event is emitted.
   * @param {any} [context] - Optional context to bind the listener function to.
   * @returns {EmitterSubscription} An EmitterSubscription object that can be used to remove the listener.
   */
  public addListener(
    event: string,
    listener: (data: any) => void,
    context?: any
  ): EmitterSubscription {
    return super.addListener(event, listener, context);
  }

  /**
   * Removes all listeners for a specific event.
   * This method will remove all callbacks for a given event.
   *
   * @param {string} event - The name of the event to remove listeners for.
   */
  public removeAllListenersForEvent(event: string): void {
    this.removeAllListeners(event);
  }
}
