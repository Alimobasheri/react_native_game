import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Component } from '../../services-ecs/component';
import { EventQueueContext } from '../../contexts-rntge/EventQueueContext/EventQueueContext';
import {
  CreateEntityBatchRequest,
  createEntityBatchRequestType,
  CreateEntityBatchResponse,
  createEntityBatchResponseType,
} from '../../internal/events/entity';
import { ExternalEvent } from '../useEventQueue/useEventQueue';

export type UseAddEntityBatchArgs = {
  batch: Component<any>[][];
};

export const useAddEntityBatch = ({ batch }: UseAddEntityBatchArgs) => {
  const eventQueueContext = useContext(EventQueueContext);

  const [entityId, setEntityId] = useState<number[] | null>(null);

  if (!eventQueueContext) {
    throw new Error(
      'useAddEntityBatch must be used within an EventQueueProvider'
    );
  }

  const onResponse = useCallback((event: ExternalEvent) => {
    if (event.type === createEntityBatchResponseType) {
      const payload: CreateEntityBatchResponse['payload'] = event.payload;
      setEntityId(payload.batchEntityId);
    }
  }, []);

  const subscriptionId = useMemo(() => {
    return eventQueueContext.subscribeJS(onResponse);
  }, []);

  useEffect(() => {
    if (subscriptionId) {
      const event: CreateEntityBatchRequest = {
        type: createEntityBatchRequestType,
        payload: {
          batch,
          responseSubId: subscriptionId,
        },
      };
      eventQueueContext.addEventJS(event);
    }
  }, [subscriptionId]);

  return { entityId };
};
