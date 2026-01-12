import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  BatchMatterBodyArgs,
  CreateMatterBodyArgs,
} from '../../internal/systems/physics/bodiesTypes';
import {
  AddMatterBodyBatchRequest,
  AddMatterBodyBatchRequestType,
  AddMatterBodyBatchResponse,
  AddMatterBodyBatchResponseType,
} from '../../internal/events/physics';
import { EventQueueContext } from '../../contexts-rntge/EventQueueContext/EventQueueContext';
import { ExternalEvent } from '../useEventQueue/useEventQueue';
import { useSceneContextUnsafe } from '../../components-rntge/Scene/hooks';

export type UseAddMatterBodyBatchArgs = {
  batch: BatchMatterBodyArgs[];
};

export const useAddMatterBodyBatch = ({ batch }: UseAddMatterBodyBatchArgs) => {
  const eventQueueContext = useContext(EventQueueContext);

  if (!eventQueueContext) {
    throw new Error(
      'useAddMatterBodyBatch must be used within an EventQueueProvider'
    );
  }

  const sceneContext = useSceneContextUnsafe();
  if (!sceneContext) throw new Error('Preload must be used within a Scene');
  const { sceneKey } = sceneContext;

  const [bodyIds, setBodyIds] = useState<number[] | null>(null);

  const onResponse = useCallback((event: ExternalEvent) => {
    if (event.type === AddMatterBodyBatchResponseType) {
      const payload: AddMatterBodyBatchResponse['payload'] = event.payload;
      setBodyIds(payload.bodyIds);
    }
  }, []);

  const subscriptionId = useMemo(() => {
    return eventQueueContext.subscribeJS(onResponse);
  }, [onResponse]);

  useEffect(() => {
    // Ensure the batch is not empty and all entityIds are valid numbers
    if (
      batch.length > 0 &&
      batch.every((item) => typeof item.entityId === 'number') &&
      !!subscriptionId &&
      !bodyIds
    ) {
      const event: AddMatterBodyBatchRequest = {
        type: AddMatterBodyBatchRequestType,
        payload: {
          batch,
          sceneKey,
          responseSubId: subscriptionId,
        },
      };
      eventQueueContext.addEventJS(event);
    }
  }, [batch, subscriptionId, bodyIds, eventQueueContext]);

  return { bodyIds };
};
