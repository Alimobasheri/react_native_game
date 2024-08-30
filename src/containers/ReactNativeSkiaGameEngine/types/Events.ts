/**
 * An event that is emitted by the game engine.
 * The type property will be used as the event name in EventDispatcher.
 * The data property will be passed to the event listeners.
 *
 * @property {string} type - The type of the event.
 * @property {*} [data] - The data associated with the event.
 */
export interface GameEvent {
  type: string;
  data?: any;
}

/**
 * A callback function that will be executed when a game event is emitted.
 * The function should take a single argument, which is the event object that
 * was emitted.
 *
 * @param {GameEvent} event - The event that was emitted.
 */
export type GameEventListener = (event: GameEvent) => void;

/**
 * A mapping of event types to callback functions.
 * When an event is emitted and the event type exists in this mapping,
 * the callback function will be called with the event object as its argument.
 */
export type OnEventListeners = Record<string, GameEventListener>;
