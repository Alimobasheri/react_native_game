import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import {
  KeyboardComponentName,
  KeyboardComponentData,
  KeyboardInputEvent,
  KeyboardInputEventPayload,
  KeyboardInputEventType,
  KeyboardEventTypes,
  KeyboardCallbackData,
} from '../components/keyboard';

const keyMatchesFilter = (keys: string[] | undefined, key: string) => {
  'worklet';
  if (!keys || keys.length === 0) {
    return true;
  }
  for (let i = 0; i < keys.length; i++) {
    if (keys[i] === key) {
      return true;
    }
  }
  return false;
};

export const keyboardSystem: System = {
  name: 'keyboardSystem',
  requiredComponents: [KeyboardComponentName],
  requiredEvents: [KeyboardInputEventType],
  process: (systemArgs) => {
    'worklet';

    const { entities, components, eventQueue } = systemArgs;

    const events = eventQueue
      .readEvents()
      .filter(
        (e: { type: string }) => e.type === KeyboardInputEventType
      ) as KeyboardInputEvent[];

    if (events.length === 0 || entities.length === 0) {
      return;
    }

    for (let evIndex = 0; evIndex < events.length; evIndex++) {
      const ev = events[evIndex].payload as KeyboardInputEventPayload;

      for (let i = 0; i < entities.length; i++) {
        const entityId = entities[i];
        const keyboardComp = components[KeyboardComponentName].get(
          entityId
        ) as KeyboardComponentData | undefined;
        if (!keyboardComp) {
          continue;
        }
        if (!keyMatchesFilter(keyboardComp.keys, ev.key)) {
          continue;
        }

        const callbackData: KeyboardCallbackData = {
          entityId,
          key: ev.key,
          code: ev.code,
          repeat: ev.repeat,
          timestamp: ev.timestamp,
          systemArgs,
        };

        if (ev.eventType === KeyboardEventTypes.Down && keyboardComp.onKeyDown) {
          try {
            keyboardComp.onKeyDown(callbackData);
          } catch {
            eventQueue.addAwaitingExternalEvent({
              type: 'rntge/keyboard/callback',
              payload: {
                entityId,
                name: 'onKeyDown',
                data: callbackData,
              },
              subscriptionId: '',
            });
          }
        } else if (
          ev.eventType === KeyboardEventTypes.Up &&
          keyboardComp.onKeyUp
        ) {
          try {
            keyboardComp.onKeyUp(callbackData);
          } catch {
            eventQueue.addAwaitingExternalEvent({
              type: 'rntge/keyboard/callback',
              payload: {
                entityId,
                name: 'onKeyUp',
                data: callbackData,
              },
              subscriptionId: '',
            });
          }
        }
      }
    }
  },
};
