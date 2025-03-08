import { Body } from 'matter-js';
import {
  AddMatterBodyRequest,
  AddMatterBodyRequestType,
} from '../../events/physics';
import {
  System,
  SystemContext,
} from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';

export const requestAddMatterBody: System = {
  requiredComponents: [],
  requiredEvents: [AddMatterBodyRequestType],
  context: SystemContext.JS,
  process: (entities, components, eventQueue, deltaTime, ecs) => {
    'worklet';
    const events = eventQueue
      .readEvents()
      .filter((e) => e.type === AddMatterBodyRequestType);
    for (let i = 0; i < events.length; i++) {
      const payload: AddMatterBodyRequest['payload'] = events[i].payload;
      console.log('🚀 ~ payload:', payload);

      // const responseEvent: AddMatterBodyResponse = {
      //   type: AddMatterBodyResponseType,
      //   payload: { bodyId: body.id },
      //   subscriptionId: payload.responseSubId,
      // };
      // eventQueue.addExternalEvent(responseEvent);
    }
  },
};
