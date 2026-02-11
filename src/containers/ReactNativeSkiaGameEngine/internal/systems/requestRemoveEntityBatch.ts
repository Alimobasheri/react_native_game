// a batch version of requestRemoveEntity System

import { Entity } from '../../services-ecs/entity';
import { System } from '../../services-ecs/system';
import { MatterBodyComponentName } from '../components/matterBody';
import { SceneComponentData, SceneComponentName } from '../components/scene';
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
      const payload: RemoveEntityBatchRequest['payload'] = events[i].payload;
      for (let j = 0; j < payload.entityIds.length; j++) {
        ecs.value.removeEntity(payload.entityIds[j]);
        const matterBody = ecs.value.components.value[MatterBodyComponentName]?.get(
          payload.entityIds[j]
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
        if (payload.sceneKey) {
          ecs.value.updateComponent<SceneComponentData>(
            sceneEntities[payload.sceneKey],
            SceneComponentName,
            (component) => {
              component.objects.entities = component.objects.entities.filter(
                (entity) => entity !== payload.entityIds[j]
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
    }
  },
};
