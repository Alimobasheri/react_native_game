import { System } from '../../services-ecs/system';
import { RemoveEntityRequest, RemoveEntityRequestType } from '../events/entity';

export const requestRemoveEntity: System = {
  requiredComponents: [],
  requiredEvents: [RemoveEntityRequestType],
  process: ({ eventQueue, ecs }) => {
    'worklet';
    const events = eventQueue
      .readEvents()
      .filter((e) => e.type === RemoveEntityRequestType);
    for (let i = 0; i < events.length; i++) {
      const payload: RemoveEntityRequest['payload'] = events[i].payload;
      ecs.value.removeEntity(payload.entityId);
    }
  },
};
