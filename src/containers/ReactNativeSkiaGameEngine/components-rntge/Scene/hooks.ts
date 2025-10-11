import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { EventQueueContext } from '../../contexts-rntge/EventQueueContext/EventQueueContext';
import { SceneContext } from './context';

export const useSubscriptionId = () => {
  const eventQueue = useContext(EventQueueContext);
  if (!eventQueue)
    throw new Error('useSubscriptionId must be used within EventQueueProvider');
  const [id] = useState(() => eventQueue.subscribeJS(() => {}));
  return id;
};

export const useEventBridge = (
  subscriptionId: string,
  handler: (event: any) => void
) => {
  const eventQueue = useContext(EventQueueContext);
  const savedHandler = useRef(handler);
  savedHandler.current = handler;
  useEffect(() => {
    if (!eventQueue) return;
    eventQueue.subscriptions.current.set(subscriptionId, (event) =>
      savedHandler.current(event)
    );
    return () => {
      eventQueue.subscriptions.current.delete(subscriptionId);
    };
  }, [eventQueue, subscriptionId]);
  return {
    addEventJS: eventQueue?.addEventJS!,
  };
};

export const useSceneContextUnsafe = () => useContext(SceneContext);
