import { System } from '../../../services-ecs/system';
import {
  AssetPreloadDoneType,
  AssetPreloadProgressType,
  AssetPreloadRequest,
  AssetPreloadRequestType,
} from '../../../components-rntge/Scene/events';
import {
  createTypefaceOnUI,
  createTypefacesOnUI,
  LoadedFontSources,
} from '@/containers/ReactNativeSkiaGameEngine/loaders-ecs';
import { SceneComponentData, SceneComponentName } from '../../components/scene';
import { Entity } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/entity';
import { SharedValue } from 'react-native-reanimated';
import { ECS } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/ecs';

type sceneObjectAsset = keyof SceneComponentData['objects']['assets'];

const pushSceneObjectsAsset = (
  ecs: ECS,
  sceneEntity: Entity,
  name: string,
  type: sceneObjectAsset
) => {
  'worklet';
  ecs.updateComponent<SceneComponentData>(
    sceneEntity,
    SceneComponentName,
    (component) => {
      component.objects.assets[type].push(name);
    }
  );
};

export const assetPreloadSystem: System = {
  requiredComponents: [],
  requiredEvents: [AssetPreloadRequestType],
  process: async ({ eventQueue, ecs }) => {
    'worklet';
    const events = eventQueue
      .readEvents()
      .filter((e) => e.type === AssetPreloadRequestType);

    for (let i = 0; i < events.length; i++) {
      const payload = events[i].payload as AssetPreloadRequest['payload'];

      const total = payload.items.length;
      let loaded = 0;

      const fontsToLoad: LoadedFontSources[] = [];

      const sceneEntities = ecs.getEntitiesWithComponents([
        SceneComponentName,
      ]);

      const sceneEntity = sceneEntities.find(
        (entity) =>
          (
            ecs.components[SceneComponentName].get(entity) as
            | SceneComponentData
            | undefined
          )?.sceneKey === payload.sceneKey
      );

      if (sceneEntity === undefined)
        throw new Error(
          `[RNTGE][assetPreloadSystem] Could not find Scene Entity for Scene Key: ${payload.sceneKey}`
        );

      for (let j = 0; j < payload.items.length; j++) {
        const item = payload.items[j];
        switch (item.type) {
          case 'image':
            const images = global._RNTGE_.imageCache;
            images[item.name] = item.data;
            pushSceneObjectsAsset(ecs, sceneEntity, item.name, 'images');
            break;
          case 'shader':
            const shaders = global._RNTGE_.shaderCache;
            shaders[item.name] = item.data;
            pushSceneObjectsAsset(ecs, sceneEntity, item.name, 'shaders');
            break;
          case 'font':
            const fonts = global._RNTGE_.fontCache;
            const typeface = createTypefaceOnUI(
              item.name,
              item.data.family,
              item.data.base64
            );
            if (typeface) {
              fonts[item.name] = typeface;
              pushSceneObjectsAsset(ecs, sceneEntity, item.name, 'fonts');
            }
            break;
          case 'atlas':
            const atlases = global._RNTGE_.atlasCache;
            atlases[item.name] = item.data;
            pushSceneObjectsAsset(ecs, sceneEntity, item.name, 'atlases');
            break;
          case 'animation':
            const clips = global._RNTGE_.clipAnimationCache;
            clips[item.name] = item.data;
            pushSceneObjectsAsset(ecs, sceneEntity, item.name, 'clips');
        }
        loaded++;
      }
      eventQueue.addAwaitingExternalEvent({
        type: AssetPreloadDoneType,
        payload: { sceneKey: payload.sceneKey },
        subscriptionId: payload.sceneSubscriptionId,
      });
    }
  },
};
