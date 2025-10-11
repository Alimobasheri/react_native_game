import { createContext } from 'react';

export type SceneContextValue = {
  sceneKey: string;
  sceneSubscriptionId: string;
  parentSceneKey?: string;
  notifyContentMounted: (cb: (shouldRender: boolean) => void) => void;
  notifyPreloadMounted: (subscriptionId: string) => void;
  waitForPreload: () => void;
};

export const SceneContext = createContext<SceneContextValue | null>(null);

export type PreloadContextValue = {
  registerAsset: (asset: any) => void;
};

export const PreloadContext = createContext<PreloadContextValue | null>(null);
