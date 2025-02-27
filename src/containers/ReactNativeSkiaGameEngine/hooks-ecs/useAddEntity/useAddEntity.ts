import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ECSContext } from '../../contexts-rntge/ECSContext/ECSContext';
import { Component } from '../../services-ecs/component';
import { EventQueueContext } from '../../contexts-rntge/EventQueueContext/EventQueueContext';
import {
  CreateEntityRequest,
  CreateEntityRequestType,
  CreateEntityResponse,
  CreateEntityResponseType,
} from '../../internal/events/entity';
import { ExternalEvent } from '../useEventQueue/useEventQueue';

export type UseAddEntityArgs = {
  components: Component<any>[];
};

export const useAddEntity = ({ components }: UseAddEntityArgs) => {
  const ecsContext = useContext(ECSContext);
  const eventQueueContext = useContext(EventQueueContext);

  const [entityId, setEntityId] = useState<number | null>(null);

  if (!eventQueueContext) {
    throw new Error('useAddEntity must be used within an EventQueueProvider');
  }

  const onResponse = useCallback((event: ExternalEvent) => {
    if (event.type === CreateEntityResponseType) {
      const payload: CreateEntityResponse['payload'] = event.payload;
      setEntityId(payload.entityId);
    }
  }, []);

  const subscriptionId = useMemo(() => {
    return eventQueueContext.subscribeJS(onResponse);
  }, []);

  useEffect(() => {
    if (subscriptionId) {
      const event: CreateEntityRequest = {
        type: CreateEntityRequestType,
        payload: {
          components,
          responseSubId: subscriptionId,
        },
      };
      eventQueueContext.addEventJS(event);
    }
  }, [subscriptionId]);

  return { entityId };
};
