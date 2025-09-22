// a batch version of requestRemoveMatterBody System

import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import {
  RemoveMatterBodyBatchRequest,
  RemoveMatterBodyBatchRequestType,
} from '../../events/physics';
import { MatterBodyComponentName } from '../../components/matterBody';

export const requestRemoveMatterBodyBatch: System = {
  requiredComponents: [],
  requiredEvents: [RemoveMatterBodyBatchRequestType],
  process: ({ components, eventQueue, ecs }) => {
    'worklet';
    const events = eventQueue
      .readEvents()
      .filter((e) => e.type === RemoveMatterBodyBatchRequestType);

    for (let i = 0; i < events.length; i++) {
      const payload: RemoveMatterBodyBatchRequest['payload'] =
        events[i].payload;
      const bodiesToRemove = [];

      // Collect all bodies to remove by accessing components from entities
      for (let j = 0; j < payload.entityIds.length; j++) {
        const entityId = payload.entityIds[j];
        const matterBodyComponent =
          components[MatterBodyComponentName]?.get(entityId);

        if (matterBodyComponent) {
          const body = matterBodyComponent.data;
          bodiesToRemove.push(body);
        }
      }

      // Remove all bodies from the Matter.js world in batch
      if (bodiesToRemove.length > 0) {
        global.MatterReanimated.Composite.remove(
          global._RNTGE_.physics.engine.world,
          bodiesToRemove
        );
      }

      // Remove components from entities
      for (let j = 0; j < payload.entityIds.length; j++) {
        const entityId = payload.entityIds[j];
        ecs.value.removeComponent(entityId, MatterBodyComponentName);
      }
    }
  },
};
