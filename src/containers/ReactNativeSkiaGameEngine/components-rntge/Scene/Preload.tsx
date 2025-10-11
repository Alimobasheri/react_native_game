import React, {
  FC,
  PropsWithChildren,
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
} from './events';
import { EventQueueContext } from '../../contexts-rntge/EventQueueContext/EventQueueContext';
import { loadImageAssets, loadShaderAssets } from '../../loaders-ecs';

export type PreloadProps = PropsWithChildren<{
  onProgress?: (loaded: number, total: number) => void;
}>;

export const Preload: FC<PreloadProps> = ({ children, onProgress }) => {
  const sceneContext = useSceneContextUnsafe();
  if (!sceneContext) throw new Error('Preload must be used within a Scene');
  const { sceneKey, sceneSubscriptionId, notifyPreloadMounted } = sceneContext;
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

  useEffect(() => {
    loadImageAssets(
      assetsRef.current
        .filter((asset) => asset.type === 'image')
        .reduce((acc, asset) => {
          acc[asset.name] = asset.uriOrBase64;
          return acc;
        }, {} as Record<string, any>)
    );

    loadShaderAssets(
      assetsRef.current
        .filter((asset) => asset.type === 'shader')
        .reduce((acc, asset) => {
          acc[asset.name] = asset.source;
          return acc;
        }, {} as Record<string, string>)
    );

    const req: AssetPreloadRequest = {
      type: AssetPreloadRequestType,
      payload: {
        sceneKey,
        items: assetsRef.current,
        subscriptionId: preloadSubscriptionId,
        sceneSubscriptionId,
      },
    };
    eventQueue.addEventJS(req);
  }, [sceneKey, preloadSubscriptionId]);

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
