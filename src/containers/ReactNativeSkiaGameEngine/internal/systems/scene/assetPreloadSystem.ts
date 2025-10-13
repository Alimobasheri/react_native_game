import { System } from '../../../services-ecs/system';
import {
  AssetPreloadDoneType,
  AssetPreloadProgressType,
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
      const payload = events[i].payload as {
        sceneKey: string;
        items: Array<any>;
        subscriptionId: string; // progress
        sceneSubscriptionId: string; // done
      };

      const total = payload.items.length;
      let loaded = 0;

      for (let j = 0; j < payload.items.length; j++) {
        const item = payload.items[j];
        if (item.type === 'atlas') {
          const atlases = global._RNTGE_.atlasCache;
          atlases[item.name] = item.data;
        } else if (item.type === 'animation') {
          const clips = global._RNTGE_.clipAnimationCache;
          clips[item.name] = item.clip;
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
