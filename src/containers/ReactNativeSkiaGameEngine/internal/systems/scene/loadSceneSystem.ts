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
      .filter(
        (e) =>
          !!e &&
          typeof e === 'object' &&
          'type' in e &&
          e.type === LoadSceneRequestType
      );

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
      let payload = events[i].payload as LoadSceneRequest['payload'];
      if (!payload?.sceneKey) continue;

      const { sceneKey } = payload;

      const sceneEntity = sceneEntities[sceneKey];
      if (typeof sceneEntity === 'undefined') continue;

      const sceneData: SceneComponentData =
        components[SceneComponentName].get(sceneEntity);
      if (!sceneData) continue;

      ecs.updateComponent<SceneComponentData>(
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
