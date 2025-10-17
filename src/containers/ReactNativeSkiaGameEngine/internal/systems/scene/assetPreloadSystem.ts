import { System } from '../../../services-ecs/system';
import {
  AssetPreloadDoneType,
  AssetPreloadProgressType,
  AssetPreloadRequest,
  AssetPreloadRequestType,
} from '../../../components-rntge/Scene/events';

export const assetPreloadSystem: System = {
  requiredComponents: [],
  requiredEvents: [AssetPreloadRequestType],
  process: ({ eventQueue }) => {
    'worklet';
    const events = eventQueue
      .readEvents()
      .filter((e) => e.type === AssetPreloadRequestType);

    for (let i = 0; i < events.length; i++) {
      const payload = events[i].payload as AssetPreloadRequest['payload'];

      const total = payload.items.length;
      let loaded = 0;

      for (let j = 0; j < payload.items.length; j++) {
        const item = payload.items[j];
        switch (item.type) {
          case 'image':
            const images = global._RNTGE_.imageCache;
            images[item.name] = item.data;
            break;
          case 'shader':
            const shaders = global._RNTGE_.shaderCache;
            shaders[item.name] = item.data;
            break;
          case 'font':
            const fonts = global._RNTGE_.fontCache;
            fonts[item.name] = item.data;
            break;
          case 'atlas':
            const atlases = global._RNTGE_.atlasCache;
            atlases[item.name] = item.data;
            break;
          case 'animation':
            const clips = global._RNTGE_.clipAnimationCache;
            clips[item.name] = item.data;
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
