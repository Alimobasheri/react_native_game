import { System } from '../../services-ecs/system';
import {
  CreateEntityRequest,
  CreateEntityRequestType,
  CreateEntityResponse,
  CreateEntityResponseType,
} from '../events/entity';

export const requestCreateEntity: System = {
  requiredComponents: [],
  requiredEvents: [CreateEntityRequestType],
  process: (entities, components, eventQueue, deltaTime, ecs) => {
    'worklet';
    const events = eventQueue
      .readEvents()
      .filter((e) => e.type === CreateEntityRequestType);
    for (let i = 0; i < events.length; i++) {
      const payload: CreateEntityRequest['payload'] = events[i].payload;
      const entity = ecs.value.createEntity();
      for (let j = 0; j < payload.components.length; j++) {
        ecs.value.addComponent(entity, payload.components[j]);
      }
      const responseEvent: CreateEntityResponse = {
        type: CreateEntityResponseType,
        payload: { entityId: entity },
        subscriptionId: payload.responseSubId,
      };
      eventQueue.addExternalEvent(responseEvent);
    }
  },
};
