import { Entity } from '../../services-ecs/entity';
import { System } from '../../services-ecs/system';
import { SceneComponentData, SceneComponentName } from '../components/scene';
import {
  CreateEntityRequest,
  CreateEntityRequestType,
  CreateEntityResponse,
  CreateEntityResponseType,
} from '../events/entity';

export const requestCreateEntity: System = {
  requiredComponents: [],
  requiredEvents: [CreateEntityRequestType],
  process: ({ eventQueue, ecs }) => {
    'worklet';
    const events = eventQueue
      .readEvents()
      .filter((e) => e.type === CreateEntityRequestType);

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
      const payload: CreateEntityRequest['payload'] = events[i].payload;
      const entity = ecs.value.createEntity();
      for (let j = 0; j < payload.components.length; j++) {
        ecs.value.addComponent(entity, payload.components[j]);
      }
      ecs.value.updateComponent<SceneComponentData>(
        sceneEntities[payload.sceneKey],
        SceneComponentName,
        (component) => {
          component.objects.entities.push(entity);
        }
      );
      if (payload.responseSubId) {
        const responseEvent: CreateEntityResponse = {
          type: CreateEntityResponseType,
          payload: { entityId: entity },
          subscriptionId: payload.responseSubId,
        };
        eventQueue.addAwaitingExternalEvent(responseEvent);
      }
    }
  },
};
