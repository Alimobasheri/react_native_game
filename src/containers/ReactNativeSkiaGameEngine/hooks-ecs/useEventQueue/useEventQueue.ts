import { createContext, useCallback, useContext } from 'react';
import { makeMutable, runOnJS, useSharedValue } from 'react-native-reanimated';

export type Event<T = any> = { type: string; payload?: T };
export type EventQueue = Event[];

export type EventQueueContextType = {
  addEvent: (event: Event) => void;
  readEvents: () => EventQueue;
  clearEvents: () => void;
};

export const useEventQueue = (): EventQueueContextType => {
  const eventStore = useSharedValue<EventQueue>([]);
  const nextEvents = useSharedValue<EventQueue>([]);

  const addEvent = useCallback((event: Event) => {
    'worklet';
    nextEvents.value = [...nextEvents.value, event];
  }, []);

  const readEvents = useCallback(() => {
    'worklet';
    return eventStore.value;
  }, []);

  const clearEvents = useCallback(() => {
    'worklet';
    eventStore.value = nextEvents.value;
    nextEvents.value = [];
  }, []);

  return { addEvent, readEvents, clearEvents };
};
