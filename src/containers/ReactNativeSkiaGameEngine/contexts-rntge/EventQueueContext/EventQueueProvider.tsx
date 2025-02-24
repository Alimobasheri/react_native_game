import { FC, PropsWithChildren } from 'react';
import { EventQueueContextType } from '../../hooks-ecs/useEventQueue/useEventQueue';
import { EventQueueContext } from './EventQueueContext';

export type EventQueueProviderProps = {
  eventQueue: EventQueueContextType;
};

export const EventQueueProvider: FC<
  PropsWithChildren<EventQueueProviderProps>
> = ({ children, eventQueue }) => {
  return (
    <EventQueueContext.Provider value={eventQueue}>
      {children}
    </EventQueueContext.Provider>
  );
};
