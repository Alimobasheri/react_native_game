import { useEffect } from 'react';
import type { EventQueueContextType } from '../../hooks-ecs/useEventQueue/useEventQueue';
import {
  KeyboardEventTypes,
  KeyboardInputEvent,
  KeyboardInputEventType,
} from '../../internal/components/keyboard';

const ARROW_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);

const hasWindowKeyboard =
  typeof window !== 'undefined' &&
  typeof window.addEventListener === 'function';

/**
 * Attaches window keydown/keyup listeners and pushes `rntge/keyboard/input`
 * events into the RNTGE event queue. No View / overlay — keyboard is global.
 * No-ops on platforms without `window` (native).
 */
export const useKeyboardInput = (eventQueue: EventQueueContextType): void => {
  useEffect(() => {
    if (!hasWindowKeyboard) {
      return;
    }

    const pushKeyEvent = (
      eventType: KeyboardEventTypes,
      nativeEvent: KeyboardEvent
    ) => {
      if (eventType === KeyboardEventTypes.Down && nativeEvent.repeat) {
        return;
      }

      if (ARROW_KEYS.has(nativeEvent.key)) {
        nativeEvent.preventDefault();
      }

      const evt: KeyboardInputEvent = {
        type: KeyboardInputEventType,
        payload: {
          eventType,
          key: nativeEvent.key,
          code: nativeEvent.code,
          repeat: nativeEvent.repeat,
          timestamp: Date.now(),
        },
      };
      eventQueue.addEventJS(evt);
    };

    const onKeyDown = (nativeEvent: KeyboardEvent) => {
      pushKeyEvent(KeyboardEventTypes.Down, nativeEvent);
    };
    const onKeyUp = (nativeEvent: KeyboardEvent) => {
      pushKeyEvent(KeyboardEventTypes.Up, nativeEvent);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [eventQueue]);
};
