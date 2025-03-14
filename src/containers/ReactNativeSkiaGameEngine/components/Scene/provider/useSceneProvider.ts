import { Camera } from '@/containers/ReactNativeSkiaGameEngine/types';
import { useCallback, useContext, useEffect, useState } from 'react';
import { SharedValue } from 'react-native-reanimated';
import { ISceneTransitionState } from '../types/transitions';
import { RNSGEContext } from '@/containers/ReactNativeSkiaGameEngine/context';
import { useTouchHandler } from '@/containers/ReactNativeSkiaGameEngine/hooks';

export interface IUseSceneProviderArgs {
  name: string;
  camera?: Camera;
  sceneTransitionState?: SharedValue<ISceneTransitionState>;
  currentIsActive?: boolean;
  currentIsTransitioning?: boolean;
}

/**
 * Hook that provides scene management functionality, such as enabling/disabling scenes,
 * switching between them, and handling scene history.
 *
 * @returns {Object} sceneContext - The context value to be provided by the `SceneProvider`.
 * @returns {Object} sceneContext.activeScenes - The currently active scenes.
 * @returns {Function} sceneContext.enableScene - Function to activate a scene.
 * @returns {Function} sceneContext.disableScene - Function to deactivate a scene.
 * @returns {Function} sceneContext.switchScene - Switches between active scenes.
 * @returns {Function} sceneContext.goBack - Navigates to the previous scene in history.
 * @returns {Function} sceneContext.registerScene - Registers a new scene.
 * @returns {Function} sceneContext.pushScene - Adds a scene to the history stack.
 * @returns {Function} sceneContext.replaceScene - Replaces the current scene in the history stack.
 *
 * @example
 * const { activeScenes, enableScene, disableScene } = useSceneProvider();
 * enableScene('level1');
 * disableScene('level2');
 */
export const useSceneProvider = ({
  name,
  camera,
  sceneTransitionState,
  currentIsActive,
  currentIsTransitioning,
}: IUseSceneProviderArgs) => {
  const rnsgeContext = useContext(RNSGEContext);
  if (!rnsgeContext) {
    throw new Error('useSceneProvider must be used within a RNSGEContext');
  }
  const { removeGesture } = useTouchHandler();
  const [activeScenes, setActiveScenes] = useState<Record<string, boolean>>({});
  const [sceneHistory, setSceneHistory] = useState<string[]>([]);
  const [sceneCamera, setSceneCamera] = useState<Camera | null>(camera || null);
  const [sceneTransition, setSceneTransition] =
    useState<SharedValue<ISceneTransitionState> | null>(
      sceneTransitionState || null
    );

  const enableScene = useCallback(
    (name: string) => setActiveScenes((prev) => ({ ...prev, [name]: true })),
    [setActiveScenes]
  );
  const disableScene = useCallback(
    (name: string) => setActiveScenes((prev) => ({ ...prev, [name]: false })),
    [setActiveScenes]
  );

  const switchScene = useCallback(
    (sceneName: string) => {
      setActiveScenes((prevScenes) => {
        const updatedScenes = Object.keys(prevScenes).reduce((acc, key) => {
          acc[key] = false;
          return acc;
        }, {} as Record<string, boolean>);

        updatedScenes[sceneName] = true;

        return updatedScenes;
      });
    },
    [setActiveScenes]
  );

  const goBack = useCallback(() => {
    if (sceneHistory.length > 1) {
      const previousScene = sceneHistory[sceneHistory.length - 2];
      switchScene(previousScene);
      setSceneHistory(sceneHistory.slice(0, -1));
    }
  }, [sceneHistory, enableScene, disableScene]);

  const pushScene = useCallback((sceneName: string) => {
    switchScene(sceneName);
    setSceneHistory((prev) => [...prev, sceneName]);
  }, []);

  const replaceScene = useCallback((sceneName: string) => {
    switchScene(sceneName);
    setSceneHistory((sceneHistory) =>
      sceneHistory.slice(0, -1).concat([sceneName])
    );
  }, []);

  const registerScene = useCallback((name: string, isActive: boolean) => {
    setActiveScenes((prev) => ({
      ...prev,
      [name]: isActive,
    }));
    if (isActive) {
      setSceneHistory((prev) => [...prev, name]);
    }
  }, []);

  useEffect(() => {
    setSceneCamera(camera || null);
  }, [sceneCamera]);

  useEffect(() => {
    if (!currentIsActive && !currentIsTransitioning) {
      rnsgeContext.entities.current.removeEntity({ sceneId: name });
      rnsgeContext.systems.current.removeSystem({ sceneId: name });
      removeGesture({ sceneId: name });
      Object.entries(activeScenes).forEach(([sceneName, isActive]) => {
        if (isActive) {
          rnsgeContext.entities.current.removeEntity({ sceneId: sceneName });
          rnsgeContext.systems.current.removeSystem({ sceneId: sceneName });
          removeGesture({ sceneId: sceneName });
        }
      });
    }
  }, [currentIsActive, currentIsTransitioning]);

  return {
    name,
    activeScenes,
    sceneCamera,
    sceneTransitionState: sceneTransition,
    enableScene,
    disableScene,
    switchScene,
    goBack,
    registerScene,
    pushScene,
    replaceScene,
  };
};
