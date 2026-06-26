import React, {
  FC,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { PreloadContext } from './context';
import {
  useSubscriptionId,
  useEventBridge,
  useSceneContextUnsafe,
} from './hooks';
import {
  AssetPreloadRequest,
  AssetPreloadRequestType,
  AssetPreloadProgressType,
  AssetPreloadDoneType,
} from './events';
import { EventQueueContext } from '../../contexts-rntge/EventQueueContext/EventQueueContext';
import {
  loadAtlasesOnUI,
  loadImageAssets,
  loadShaderAssets,
  loadClipAnimationsOnUI,
  LoadedClipAnimation,
  LoadedAtlas,
} from '../../loaders-ecs';
import { loadFontAssets } from '../../loaders-ecs/fonts';

export type PreloadProps = PropsWithChildren<{
  onProgress?: (loaded: number, total: number) => void;
}>;

export const Preload: FC<PreloadProps> = ({ children, onProgress }) => {
  const sceneContext = useSceneContextUnsafe();
  if (!sceneContext) throw new Error('Preload must be used within a Scene');
  const { sceneKey, sceneSubscriptionId, isActive, notifyPreloadMounted } =
    sceneContext;
  const eventQueue = React.useContext(EventQueueContext);
  if (!eventQueue)
    throw new Error('Preload must be used within EventQueueProvider');

  const assetsRef = useRef<any[]>([]);
  const preloadSubscriptionId = useSubscriptionId();
  useEventBridge(preloadSubscriptionId, (event) => {
    if (
      event.type === AssetPreloadProgressType &&
      typeof onProgress === 'function'
    ) {
      onProgress(event.payload.loaded, event.payload.total);
    }
  });

  useEffect(() => {
    notifyPreloadMounted(preloadSubscriptionId);
  }, [preloadSubscriptionId]);

  const loadAssetsAndSendToUI = useCallback(async () => {
    try {
      const loadedImages = await loadImageAssets(
        assetsRef.current
          .filter((asset) => asset.type === 'image')
          .reduce((acc, asset) => {
            acc[asset.name] = asset.uriOrBase64;
            return acc;
          }, {} as Record<string, any>)
      );

      const loadedShaders = loadShaderAssets(
        assetsRef.current
          .filter((asset) => asset.type === 'shader')
          .reduce((acc, asset) => {
            acc[asset.name] = asset.source;
            return acc;
          }, {} as Record<string, string>)
      );
      const loadedAtlases: LoadedAtlas[] = assetsRef.current
        .filter((asset) => asset.type === 'atlas')
        .map((item) => ({
          type: item.type,
          name: item.name,
          data: item.data,
        }));
      const loadedAnimationClips: LoadedClipAnimation[] = assetsRef.current
        .filter((asset) => asset.type === 'animation')
        .map((item) => ({
          type: item.type,
          name: item.name,
          data: item.data,
        }));
      const loadedFonts = await loadFontAssets(
        assetsRef.current.filter((asset) => asset.type === 'font')
      );
      const req: AssetPreloadRequest = {
        type: AssetPreloadRequestType,
        payload: {
          sceneKey,
          items: [
            ...loadedImages,
            ...loadedShaders,
            ...loadedAtlases,
            ...loadedAnimationClips,
            ...loadedFonts,
          ],
          subscriptionId: preloadSubscriptionId,
          sceneSubscriptionId,
        },
      };
      eventQueue.addEventJS(req);
    } catch (error) {
      console.error('[RNTGE] Preload failed — unlocking scene anyway:', error);
      eventQueue.callAllAwaitingExternalEventsJS([
        {
          type: AssetPreloadDoneType,
          payload: { sceneKey },
          subscriptionId: sceneSubscriptionId,
        },
      ]);
    }
  }, [sceneKey, sceneSubscriptionId, preloadSubscriptionId, eventQueue]);

  useEffect(() => {
    if (isActive) loadAssetsAndSendToUI();
  }, [sceneKey, isActive, preloadSubscriptionId]);

  const value = useMemo(
    () => ({
      registerAsset: (asset: any) => {
        assetsRef.current.push(asset);
      },
    }),
    []
  );

  return (
    <PreloadContext.Provider value={value}>{children}</PreloadContext.Provider>
  );
};
