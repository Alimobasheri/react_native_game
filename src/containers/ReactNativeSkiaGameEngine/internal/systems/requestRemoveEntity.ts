import { System } from '../../services-ecs/system';
import { RemoveEntityRequest, RemoveEntityRequestType } from '../events/entity';
import { MatterBodyComponentName } from '../components/matterBody';
import { SceneComponentData, SceneComponentName } from '../components/scene';
import { Entity } from '../../services-ecs/entity';

export const requestRemoveEntity: System = {
  requiredComponents: [],
  requiredEvents: [RemoveEntityRequestType],
  process: ({ eventQueue, ecs, components }) => {
    'worklet';
    const events = eventQueue
      .readEvents()
      .filter((e) => e.type === RemoveEntityRequestType);

    const sceneEntities: Record<string, Entity> = ecs.value
      .getEntitiesWithComponents([SceneComponentName])
      .reduce((byKey, entity) => {
        const entityData = ecs.value.components.value[SceneComponentName].get(
          entity
        ) as SceneComponentData;
        return {
          ...byKey,
          [entityData.sceneKey]: entity,
        };
      }, {});
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
      if (payload.sceneKey) {
        ecs.value.updateComponent<SceneComponentData>(
          sceneEntities[payload.sceneKey],
          SceneComponentName,
          (component) => {
            component.objects.entities = component.objects.entities.filter(
              (entity) => entity !== payload.entityId
            );
            if (matterBody) {
              component.objects.matterBodies = component.objects.matterBodies.filter(
                (body) => body !== matterBody
              );
            }
          }
        );
      }
    }
  },
};
