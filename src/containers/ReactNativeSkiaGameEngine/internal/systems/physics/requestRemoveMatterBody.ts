import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import {
  RemoveMatterBodyRequest,
  RemoveMatterBodyRequestType,
} from '../../events/physics';
import { MatterBodyComponentName } from '../../components/matterBody';

export const requestRemoveMatterBody: System = {
  requiredComponents: [],
  requiredEvents: [RemoveMatterBodyRequestType],
  process: ({ components, eventQueue, ecs }) => {
    'worklet';
    const events = eventQueue
      .readEvents()
      .filter((e) => e.type === RemoveMatterBodyRequestType);

    for (let i = 0; i < events.length; i++) {
      const payload: RemoveMatterBodyRequest['payload'] = events[i].payload;

      // Get the matter body component from the entity
      const matterBodyComponent = components[MatterBodyComponentName]?.get(
        payload.entityId
      );

      if (matterBodyComponent) {
        const body = matterBodyComponent.data;

        // Remove the body from the Matter.js world
        global.MatterReanimated.Composite.remove(
          global._RNTGE_.physics.engine.world,
          body
        );

        // Remove the component from the entity
        ecs.value.removeComponent(payload.entityId, MatterBodyComponentName);
      }
    }
  },
};
