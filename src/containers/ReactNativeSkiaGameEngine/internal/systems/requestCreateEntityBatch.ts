import { System } from '../../services-ecs/system';
import {
  CreateEntityBatchRequest,
  createEntityBatchRequestType,
  CreateEntityBatchResponse,
  createEntityBatchResponseType,
} from '../events/entity';

export const requestCreateEntityBatch: System = {
  requiredComponents: [],
  requiredEvents: [createEntityBatchRequestType],
  process: ({ eventQueue, ecs }) => {
    'worklet';
    const events = eventQueue
      .readEvents()
      .filter((e) => e.type === createEntityBatchRequestType);

    for (let i = 0; i < events.length; i++) {
      let batchEntityId: number[] = [];
      const payload: CreateEntityBatchRequest['payload'] = events[i].payload;
      for (let j = 0; j < payload.batch.length; j++) {
        const entity = ecs.value.createEntity();
        for (let k = 0; k < payload.batch[j].length; k++) {
          ecs.value.addComponent(entity, payload.batch[j][k]);
        }
        batchEntityId.push(entity);
      }
      const responseEvent: CreateEntityBatchResponse = {
        type: createEntityBatchResponseType,
        payload: { batchEntityId },
        subscriptionId: payload.responseSubId,
      };
      eventQueue.addAwaitingExternalEvent(responseEvent);
    }
  },
};
