import { MutableRefObject, useCallback, useRef } from 'react';
import {
  runOnJS,
  runOnUI,
  SharedValue,
  useSharedValue,
} from 'react-native-reanimated';
import { uid } from '../../services';

export type Event<T = any> = { type: string; payload?: T };
export type ExternalEvent<T = any> = Event<T> & { subscriptionId: string };
export type EventQueue = Event[];

export type SubscriptionCallback = (event: ExternalEvent) => void;

export type EventQueueContextType = {
  subscriptions: MutableRefObject<Map<string, (payload: any) => void>>;
  nextExternalEvents: SharedValue<ExternalEvent[]>;
  addEvent: (event: Event) => void;
  addEventJS: (event: Event) => void;
  addExternalEvent: (event: ExternalEvent) => void;
  readEvents: () => EventQueue;
  clearEvents: () => void;
  subscribeJS: (callback: SubscriptionCallback) => string;
  addAwaitingExternalEvent: (event: ExternalEvent) => void;
  callAllAwaitingExternalEvents: () => void;
  callAllAwaitingExternalEventsJS: () => void;
};

export const useEventQueue = (): EventQueueContextType => {
  const eventStore = useSharedValue<EventQueue>([]);
  const nextEvents = useSharedValue<EventQueue>([]);
  const nextExternalEvents = useSharedValue<ExternalEvent[]>([]);

  const subscriptions = useRef<Map<string, (payload: any) => void>>(new Map());

  const addEvent = useCallback((event: Event) => {
    'worklet';
    nextEvents.value = [...nextEvents.value, event];
  }, []);

  const addEventJS = useCallback((event: Event) => {
    runOnUI(addEvent)(event);
  }, []);

  const callSubscriptionJS = useCallback(
    (event: ExternalEvent) => {
      const callback = subscriptions.current.get(event.subscriptionId);
      if (callback) {
        callback(event);
      }
    },
    [subscriptions]
  );

  const addExternalEvent = (event: ExternalEvent) => {
    'worklet';
    runOnJS(callSubscriptionJS)(event);
  };

  const addAwaitingExternalEvent = useCallback((event: ExternalEvent) => {
    'worklet';
    nextExternalEvents.value = [...nextExternalEvents.value, event];
  }, []);

  const callAllAwaitingExternalEventsJS = useCallback(() => {
    nextExternalEvents.value.forEach((event) => {
      callSubscriptionJS(event);
    });
    nextExternalEvents.value = [];
  }, [callSubscriptionJS]);

  const callAllAwaitingExternalEvents = useCallback(() => {
    'worklet';
    runOnJS(callAllAwaitingExternalEventsJS)();
  }, [callAllAwaitingExternalEventsJS]);

  const readEvents = useCallback(() => {
    'worklet';
    return eventStore.value;
  }, []);

  const clearEvents = useCallback(() => {
    'worklet';
    eventStore.value = nextEvents.value;
    nextEvents.value = [];
  }, []);

  const subscribeJS = (callback: SubscriptionCallback): string => {
    const subscriptionId = uid();
    subscriptions.current.set(subscriptionId, callback);
    return subscriptionId;
  };

  return {
    subscriptions,
    nextExternalEvents,
    addEvent,
    addEventJS,
    addExternalEvent,
    readEvents,
    clearEvents,
    subscribeJS,
    addAwaitingExternalEvent,
    callAllAwaitingExternalEvents,
    callAllAwaitingExternalEventsJS,
  };
};
