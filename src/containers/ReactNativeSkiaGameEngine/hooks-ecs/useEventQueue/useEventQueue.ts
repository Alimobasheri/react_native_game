import { MutableRefObject, useCallback, useRef } from 'react';
import { uid } from '../../services';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

export type Event<T = any> = { type: string; payload?: T };
export type ExternalEvent<T = any> = Event<T> & { subscriptionId: string };
export type EventQueue = Event[];

export type SubscriptionCallback = (event: ExternalEvent) => void;

export type EventQueueContextType = {
  subscriptions: MutableRefObject<Map<string, (payload: any) => void>>;
  addEvent: (event: Event) => void;
  addEventJS: (event: Event) => void;
  addExternalEvent: (event: ExternalEvent) => void;
  readEvents: () => EventQueue;
  clearEvents: () => void;
  subscribeJS: (callback: SubscriptionCallback) => string;
  addAwaitingExternalEvent: (event: ExternalEvent) => void;
  callAllAwaitingExternalEvents: () => void;
  callAllAwaitingExternalEventsJS: (events: ExternalEvent[]) => void;
};

export const useEventQueue = (): EventQueueContextType => {

  const subscriptions = useRef<Map<string, (payload: any) => void>>(new Map());

  const addEvent = useCallback((event: Event) => {
    'worklet';
    if (global?._RNTGE_?.eventQueue) {
      global._RNTGE_.eventQueue.nextEvents = [...global._RNTGE_.eventQueue.nextEvents, event];
    }
  }, []);

  const addEventJS = useCallback((event: Event) => {
    scheduleOnUI(addEvent, event);
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
    scheduleOnRN(callSubscriptionJS, event);
  };

  const addAwaitingExternalEvent = useCallback((event: ExternalEvent) => {
    'worklet';
    if (global?._RNTGE_?.eventQueue) {
      global._RNTGE_.eventQueue.nextExternalEvents = [...global._RNTGE_.eventQueue.nextExternalEvents, event];
    }
  }, []);

  const callAllAwaitingExternalEventsJS = useCallback((events: ExternalEvent[]) => {
    events.forEach((event) => {
      callSubscriptionJS(event);
    });
  }, [callSubscriptionJS]);

  const callAllAwaitingExternalEvents = useCallback(() => {
    'worklet';
    if (global?._RNTGE_?.eventQueue && global._RNTGE_.eventQueue.nextExternalEvents.length > 0) {
      const events = global._RNTGE_.eventQueue.nextExternalEvents;
      scheduleOnRN(callAllAwaitingExternalEventsJS, events);
      global._RNTGE_.eventQueue.nextExternalEvents = [];
    }
  }, [callAllAwaitingExternalEventsJS]);

  const readEvents = useCallback(() => {
    'worklet';
    if (global?._RNTGE_?.eventQueue) {
      return global._RNTGE_.eventQueue.eventStore;
    }
    return [];
  }, []);

  const clearEvents = useCallback(() => {
    'worklet';
    if (global?._RNTGE_?.eventQueue) {
      global._RNTGE_.eventQueue.eventStore = global._RNTGE_.eventQueue.nextEvents;
      global._RNTGE_.eventQueue.nextEvents = [];
    }
  }, []);

  const subscribeJS = (callback: SubscriptionCallback): string => {
    const subscriptionId = uid();
    subscriptions.current.set(subscriptionId, callback);
    return subscriptionId;
  };

  return {
    subscriptions,
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
