import {
  LoadSceneRequest,
  LoadSceneRequestType,
  LoadSceneResponseType,
} from '@/containers/ReactNativeSkiaGameEngine/components-rntge/Scene/events';
import { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';
import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import { SceneComponentName, SceneComponentData } from '../../components/scene';

export const loadSceneSystem: System = {
  requiredEvents: [LoadSceneRequestType],
  process: ({ eventQueue, ecs, components }) => {
    'worklet';
    const events = eventQueue
      .readEvents()
      .filter((e) => e.type === LoadSceneRequestType);

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
      let payload = events[i].payload as LoadSceneRequest['payload'];

      const { sceneKey } = payload;

      const sceneEntity = sceneEntities[sceneKey];

      const sceneData: SceneComponentData =
        components[SceneComponentName].get(sceneEntity);

      ecs.value.updateComponent<SceneComponentData>(
        sceneEntity,
        SceneComponentName,
        (sc) => {
          sc.isActive = true;
        }
      );

      if (sceneData.subscriptionId) {
        eventQueue.addAwaitingExternalEvent({
          type: LoadSceneResponseType,
          payload: {
            loaded: true,
          },
          subscriptionId: sceneData.subscriptionId,
        });
      }
    }
  },
};
