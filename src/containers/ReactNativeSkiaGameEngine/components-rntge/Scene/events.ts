import {
  LoadedAtlas,
  LoadedClipAnimation,
  LoadedImage,
  LoadedShader,
  LoadedFontSources,
} from '../../loaders-ecs';

// JS -> UI
export const SceneRegisterRequestType = 'rntge/scene/register' as const;
export type SceneRegisterRequest = {
  type: typeof SceneRegisterRequestType;
  payload: {
    sceneKey: string;
    subscriptionId: string;
    isActive: boolean;
    isPaused: boolean;
    parentSceneKey?: string;
    zIndex?: number;
  };
};

export const SceneSetActiveRequestType = 'rntge/scene/setActive' as const;
export type SceneSetActiveRequest = {
  type: typeof SceneSetActiveRequestType;
  payload: {
    sceneKey: string;
    isActive: boolean;
    isPaused?: boolean;
  };
};

export const SceneSetPreloadStateRequestType =
  'rntge/scene/setPreloadState' as const;
export type SceneSetPreloadStateRequest = {
  type: typeof SceneSetPreloadStateRequestType;
  payload: {
    sceneKey: string;
    isPreloading: boolean;
  };
};

export const AssetPreloadRequestType = 'rntge/asset/preload' as const;
export type AssetPreloadRequest = {
  type: typeof AssetPreloadRequestType;
  payload: {
    sceneKey: string;
    items: Array<
      | LoadedImage
      | LoadedShader
      | LoadedAtlas
      | LoadedClipAnimation
      | LoadedFontSources
    >;
    subscriptionId: string; // preload subscription (progress)
    sceneSubscriptionId: string; // scene subscription (done)
  };
};

// UI -> JS
export const SceneRegisteredResponseType = 'rntge/scene/registered' as const;
export type SceneRegisteredResponse = {
  type: typeof SceneRegisteredResponseType;
  payload: { sceneKey: string };
  subscriptionId: string;
};

export const AssetPreloadProgressType = 'rntge/asset/preload/progress' as const;
export type AssetPreloadProgress = {
  type: typeof AssetPreloadProgressType;
  payload: { sceneKey: string; loaded: number; total: number };
  subscriptionId: string;
};

export const AssetPreloadDoneType = 'rntge/asset/preload/done' as const;
export type AssetPreloadDone = {
  type: typeof AssetPreloadDoneType;
  payload: { sceneKey: string };
  subscriptionId: string;
};

export const LoadSceneRequestType = 'rntge/scene/load' as const;
export type LoadSceneRequest = {
  type: typeof LoadSceneRequestType;
  payload: { sceneKey: string };
  subscriptionId?: string;
};

export const LoadSceneResponseType = 'rntge/scene/load/response' as const;
export type LoadSceneResponse = {
  type: typeof LoadSceneResponseType;
  payload: { loaded: boolean; error?: string };
  subscriptionId: string;
};

export const UnLoadSceneRequestType = 'rntge/scene/unload' as const;
export type UnLoadSceneRequest = {
  type: typeof UnLoadSceneRequestType;
  payload: { sceneKey: string };
  subscriptionId?: string;
};

export const UnLoadSceneResponseType = 'rntge/scene/unload/response' as const;
export type UnLoadSceneResponse = {
  type: typeof UnLoadSceneResponseType;
  payload: { unloaded: boolean; error?: string };
  subscriptionId: string;
};
