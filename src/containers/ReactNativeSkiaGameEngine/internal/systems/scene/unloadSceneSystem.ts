import {
  UnLoadSceneRequest,
  UnLoadSceneRequestType,
} from '@/containers/ReactNativeSkiaGameEngine/components-rntge/Scene/events';
import { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';
import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import { SceneComponentName, SceneComponentData } from '../../components/scene';

export const UnLoadSceneSystem: System = {
  requiredEvents: [UnLoadSceneRequestType],
  process: ({ eventQueue, ecs }) => {
    'worklet';
    const events = eventQueue
      .readEvents()
      .filter((e) => e.type === UnLoadSceneRequestType);

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
      let payload = events[i].payload as UnLoadSceneRequest['payload'];

      const { sceneKey } = payload;

      const sceneEntity = sceneEntities[sceneKey];

      const sceneData = ecs.value.components.value[SceneComponentName].get(
        sceneEntity
      ) as SceneComponentData;

      const { entities, assets, matterBodies, systems } = sceneData.objects;

      for (let i = 0; i < entities.length; i++) {
        ecs.value.removeEntity(entities[i]);
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
        ecs.value.removeSystem(systems[k]);
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

      ecs.value.updateComponent<SceneComponentData>(
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
    }
  },
};
