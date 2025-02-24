import { createContext } from 'react';
import { EventQueueContextType } from '../../hooks-ecs/useEventQueue/useEventQueue';

export const EventQueueContext = createContext<EventQueueContextType | null>(
  null
);
