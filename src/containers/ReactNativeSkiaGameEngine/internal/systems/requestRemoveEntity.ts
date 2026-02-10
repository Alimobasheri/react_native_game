import { System } from '../../services-ecs/system';
import { RemoveEntityRequest, RemoveEntityRequestType } from '../events/entity';
import { MatterBodyComponentName } from '../components/matterBody';

export const requestRemoveEntity: System = {
  requiredComponents: [],
  requiredEvents: [RemoveEntityRequestType],
  process: ({ eventQueue, ecs, components }) => {
    'worklet';
    const events = eventQueue
      .readEvents()
      .filter((e) => e.type === RemoveEntityRequestType);
    for (let i = 0; i < events.length; i++) {
      const payload: RemoveEntityRequest['payload'] = events[i].payload;

      // If this entity has a Matter body, remove it from the physics world first.
      // This avoids leaking physics bodies when entities are removed.
      const matterBody = components[MatterBodyComponentName]?.get(
        payload.entityId
      );
      if (matterBody && global._RNTGE_?.physics && global.MatterReanimated) {
        try {
          global.MatterReanimated.Composite.remove(
            global._RNTGE_.physics.engine.world,
            matterBody
          );
        } catch {
          // Ignore removal errors (entity may already be gone)
        }
      }
      ecs.value.removeEntity(payload.entityId);
    }
  },
};
