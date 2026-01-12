import { Entity } from '../../services-ecs/entity';
import { System } from '../../services-ecs/system';
import { SceneComponentName, SceneComponentData } from '../components/scene';
import {
  AddSystemRequest,
  AddSystemRequestType,
  AddSystemResponse,
  AddSystemResponseType,
} from '../events/system';

export const requestAddSystem: System = {
  requiredComponents: [],
  requiredEvents: [AddSystemRequestType],
  process: ({ eventQueue, ecs }) => {
    'worklet';
    const events = eventQueue
      .readEvents()
      .filter((e) => e.type === AddSystemRequestType);
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
      const payload: AddSystemRequest['payload'] = events[i].payload;
      const systemId = ecs.value.registerSystem(payload.system);
      ecs.value.updateComponent<SceneComponentData>(
        sceneEntities[payload.sceneKey],
        SceneComponentName,
        (component) => {
          component.objects.systems.push(systemId);
        }
      );
      const responseEvent: AddSystemResponse = {
        type: AddSystemResponseType,
        payload: { systemId },
        subscriptionId: payload.responseSubId,
      };
      eventQueue.addExternalEvent(responseEvent);
    }
  },
};
