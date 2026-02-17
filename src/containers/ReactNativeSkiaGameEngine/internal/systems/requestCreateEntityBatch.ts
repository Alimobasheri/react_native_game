import { Entity } from '../../services-ecs/entity';
import { System } from '../../services-ecs/system';
import { SceneComponentName, SceneComponentData } from '../components/scene';
import {
  CreateEntityBatchRequest,
  createEntityBatchRequestType,
  CreateEntityBatchResponse,
  createEntityBatchResponseType,
} from '../events/entity';

export const requestCreateEntityBatch: System = {
  requiredComponents: [],
  requiredEvents: [createEntityBatchRequestType],
  process: ({ eventQueue, ecs }) => {
    'worklet';
    const events = eventQueue
      .readEvents()
      .filter((e) => e.type === createEntityBatchRequestType);

    const sceneEntities: Record<string, Entity> = ecs
      .getEntitiesWithComponents([SceneComponentName])
      .reduce((byKey, entity) => {
        const entityData = ecs.components[SceneComponentName].get(
          entity
        ) as SceneComponentData;
        return {
          ...byKey,
          [entityData.sceneKey]: entity,
        };
      }, {});
    for (let i = 0; i < events.length; i++) {
      let batchEntityId: number[] = [];
      const payload: CreateEntityBatchRequest['payload'] = events[i].payload;
      for (let j = 0; j < payload.batch.length; j++) {
        const entity = ecs.createEntity();
        for (let k = 0; k < payload.batch[j].length; k++) {
          ecs.addComponent(entity, payload.batch[j][k]);
        }
        batchEntityId.push(entity);
      }
      ecs.updateComponent<SceneComponentData>(
        sceneEntities[payload.sceneKey],
        SceneComponentName,
        (component) => {
          component.objects.entities.push(...batchEntityId);
        }
      );
      const responseEvent: CreateEntityBatchResponse = {
        type: createEntityBatchResponseType,
        payload: { batchEntityId },
        subscriptionId: payload.responseSubId,
      };
      eventQueue.addAwaitingExternalEvent(responseEvent);
    }
  },
};
