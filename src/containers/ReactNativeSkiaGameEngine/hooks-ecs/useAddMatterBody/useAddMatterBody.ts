import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { CreateMatterBodyArgs } from '../../internal/systems/physics/bodiesTypes';
import {
  AddMatterBodyRequest,
  AddMatterBodyRequestType,
  AddMatterBodyResponse,
  AddMatterBodyResponseType,
} from '../../internal/events/physics';
import { EventQueueContext } from '../../contexts-rntge/EventQueueContext/EventQueueContext';
import {
  CreateEntityResponseType,
  CreateEntityResponse,
} from '../../internal/events/entity';
import { ExternalEvent } from '../useEventQueue/useEventQueue';

export type UseAddMatterBodyArgs = {
  args: CreateMatterBodyArgs;
  entityId: number | null;
};

export const useAddMatterBody = ({ args, entityId }: UseAddMatterBodyArgs) => {
  const eventQueueContext = useContext(EventQueueContext);

  if (!eventQueueContext) {
    throw new Error('useAddEntity must be used within an EventQueueProvider');
  }

  const [bodyId, setBodyId] = useState<number | null>(null);

  const onResponse = useCallback((event: ExternalEvent) => {
    if (event.type === AddMatterBodyResponseType) {
      const payload: AddMatterBodyResponse['payload'] = event.payload;
      setBodyId(payload.bodyId);
    }
  }, []);

  const subscriptionId = useMemo(() => {
    return eventQueueContext.subscribeJS(onResponse);
  }, []);
  useEffect(() => {
    if (
      typeof entityId === 'number' &&
      !!subscriptionId &&
      typeof bodyId !== 'number'
    ) {
      const event: AddMatterBodyRequest = {
        type: AddMatterBodyRequestType,
        payload: {
          args: args,
          entityId,
          responseSubId: subscriptionId,
        },
      };
      eventQueueContext.addEventJS(event);
    }
  }, [entityId, subscriptionId]);

  return { bodyId };
};
