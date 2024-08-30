import { useRef } from 'react';
import { EventDispatcher } from '../../services';

/**
 * A React hook that provides a stable reference to a singleton instance of the `EventDispatcher` class,
 * used for managing and dispatching global events within the game engine.
 *
 * This hook ensures that the `EventDispatcher` instance persists across renders,
 * allowing consistent event dispatching and handling throughout the lifecycle of the game.
 *
 * @returns {React.MutableRefObject<EventDispatcher>} - A reference to the `EventDispatcher` instance.
 *
 * @example
 * const dispatcher = useDispatcher();
 *
 * // Access the EventDispatcher instance:
 * const eventDispatcher = dispatcher.current;
 *
 * // Dispatch an event:
 * eventDispatcher.emitEvent({type: 'MyEvent', data: { key: 'value' }});
 *
 * // Add a listener to a specific event:
 * eventDispatcher.addListener('MyEvent', (event: GameEvent) => {
 *   console.log(event.type, event.data);
 * });
 *
 * // Remove the listener:
 * const listenerId = eventDispatcher.addListenerToAllEvents((event: GameEvent) => {
 *   console.log('Global Event:', event);
 * });
 * eventDispatcher.removeListenerToAllEvents(listenerId);
 */
export const useDispatcher = () => {
  const dispatcherRef = useRef<EventDispatcher>(new EventDispatcher());
  return dispatcherRef;
};
