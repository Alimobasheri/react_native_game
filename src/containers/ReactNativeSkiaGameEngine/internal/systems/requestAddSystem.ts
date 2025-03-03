import { System } from '../../services-ecs/system';
import {
  AddSystemRequest,
  AddSystemRequestType,
  AddSystemResponse,
  AddSystemResponseType,
} from '../events/system';

export const requestAddSystem: System = {
  requiredComponents: [],
  requiredEvents: [AddSystemRequestType],
  process: (entities, components, eventQueue, deltaTime, ecs) => {
    'worklet';
    const events = eventQueue
      .readEvents()
      .filter((e) => e.type === AddSystemRequestType);
    for (let i = 0; i < events.length; i++) {
      const payload: AddSystemRequest['payload'] = events[i].payload;
      const systemId = ecs.value.registerSystem(payload.system);
      const responseEvent: AddSystemResponse = {
        type: AddSystemResponseType,
        payload: { systemId },
        subscriptionId: payload.responseSubId,
      };
      eventQueue.addExternalEvent(responseEvent);
    }
  },
};
