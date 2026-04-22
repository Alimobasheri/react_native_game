import {
  UnLoadSceneRequest,
  UnLoadSceneRequestType,
  UnLoadSceneResponseType,
} from '@/containers/ReactNativeSkiaGameEngine/components-rntge/Scene/events';
import { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';
import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import { SceneComponentName, SceneComponentData } from '../../components/scene';

export const unLoadSceneSystem: System = {
  requiredEvents: [UnLoadSceneRequestType],
  process: ({ eventQueue, ecs }) => {
    'worklet';
    const events = eventQueue
      .readEvents()
      .filter(
        (e) =>
          !!e &&
          typeof e === 'object' &&
          'type' in e &&
          e.type === UnLoadSceneRequestType
      );

    const sceneEntities: Record<string, Entity> = ecs.getEntitiesWithComponents([
      SceneComponentName,
    ]).reduce((byKey, entity) => {
      const entityData = ecs.components[SceneComponentName].get(
        entity
      ) as SceneComponentData;
      return {
        ...byKey,
        [entityData.sceneKey]: entity,
      };
    }, {});

    for (let i = 0; i < events.length; i++) {
      let payload = events[i].payload as UnLoadSceneRequest['payload'];
      if (!payload?.sceneKey) continue;

      const { sceneKey } = payload;

      const sceneEntity = sceneEntities[sceneKey];
      if (typeof sceneEntity === 'undefined') continue;

      const sceneData = ecs.components[SceneComponentName].get(
        sceneEntity
      ) as SceneComponentData;
      if (!sceneData?.objects) continue;

      const { entities, assets, matterBodies, systems } = sceneData.objects;

      for (let i = 0; i < entities.length; i++) {
        ecs.removeEntity(entities[i]);
      }

      if (!!global._RNTGE_.physics?.engine.world) {
        for (let j = 0; j < matterBodies.length; j++) {
          const body = global.MatterReanimated.Composite.get(
            global._RNTGE_.physics?.engine.world,
            matterBodies[j],
            'body'
          );
          global.MatterReanimated.Composite.remove(
            global._RNTGE_.physics?.engine.world,
            body
          );
        }
      }

      for (let k = 0; k < systems.length; k++) {
        ecs.removeSystem(systems[k]);
      }

      const { images, shaders, fonts, atlases, clips } = assets;

      for (let x = 0; x < images.length; x++) {
        delete global._RNTGE_.imageCache[images[x]];
      }
      for (let z = 0; z < shaders.length; z++) {
        delete global._RNTGE_.shaderCache[shaders[z]];
      }
      for (let y = 0; y < fonts.length; y++) {
        delete global._RNTGE_.fontCache[fonts[y]];
      }
      for (let w = 0; w < atlases.length; w++) {
        delete global._RNTGE_.atlasCache[atlases[w]];
      }
      for (let q = 0; q < clips.length; q++) {
        delete global._RNTGE_.clipAnimationCache[clips[q]];
      }

      ecs.updateComponent<SceneComponentData>(
        sceneEntity,
        SceneComponentName,
        (sc) => {
          sc.isActive = false;
          sc.objects = {
            assets: {
              images: [],
              fonts: [],
              shaders: [],
              atlases: [],
              clips: [],
            },
            entities: [],
            systems: [],
            matterBodies: [],
          };
        }
      );

      if (sceneData.subscriptionId) {
        eventQueue.addAwaitingExternalEvent({
          type: UnLoadSceneResponseType,
          payload: {
            unloaded: true,
          },
          subscriptionId: sceneData.subscriptionId,
        });
      }
    }
  },
};
