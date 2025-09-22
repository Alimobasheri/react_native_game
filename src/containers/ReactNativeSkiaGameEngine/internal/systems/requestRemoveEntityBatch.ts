// a batch version of requestRemoveEntity System

import { System } from '../../services-ecs/system';
import {
  RemoveEntityBatchRequest,
  RemoveEntityBatchRequestType,
} from '../events/entity';

export const requestRemoveEntityBatch: System = {
  requiredComponents: [],
  requiredEvents: [RemoveEntityBatchRequestType],
  process: ({ eventQueue, ecs }) => {
    'worklet';
    const events = eventQueue
      .readEvents()
      .filter((e) => e.type === RemoveEntityBatchRequestType);

    for (let i = 0; i < events.length; i++) {
      const payload: RemoveEntityBatchRequest['payload'] = events[i].payload;
      for (let j = 0; j < payload.entityIds.length; j++) {
        ecs.value.removeEntity(payload.entityIds[j]);
      }
    }
  },
};
