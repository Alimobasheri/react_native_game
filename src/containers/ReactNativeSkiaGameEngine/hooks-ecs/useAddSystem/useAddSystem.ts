import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ECSContext } from '../../contexts-rntge/ECSContext/ECSContext';
import { EventQueueContext } from '../../contexts-rntge/EventQueueContext/EventQueueContext';
import { ExternalEvent } from '../useEventQueue/useEventQueue';
import { System } from '../../services-ecs/system';
import {
  AddSystemRequest,
  AddSystemRequestType,
  AddSystemResponse,
  AddSystemResponseType,
} from '../../internal/events/system';
import { useSceneContextUnsafe } from '../../components-rntge/Scene/hooks';

export type UseAddSystemArgs = {
  system: System;
};

export const useAddSystem = ({ system }: UseAddSystemArgs) => {
  const eventQueueContext = useContext(EventQueueContext);

  const [systemId, setSystemId] = useState<number | null>(null);

  if (!eventQueueContext) {
    throw new Error('useAddSystem must be used within an EventQueueProvider');
  }

  const sceneContext = useSceneContextUnsafe();
  if (!sceneContext) throw new Error('Preload must be used within a Scene');
  const { sceneKey } = sceneContext;

  const onResponse = useCallback((event: ExternalEvent) => {
    if (event.type === AddSystemResponseType) {
      const payload: AddSystemResponse['payload'] = event.payload;
      setSystemId(payload.systemId);
    }
  }, []);

  const subscriptionId = useMemo(() => {
    return eventQueueContext.subscribeJS(onResponse);
  }, []);

  useEffect(() => {
    if (subscriptionId) {
      const event: AddSystemRequest = {
        type: AddSystemRequestType,
        payload: {
          system,
          sceneKey,
          responseSubId: subscriptionId,
        },
      };
      eventQueueContext.addEventJS(event);
    }
  }, [subscriptionId]);

  return { systemId };
};
