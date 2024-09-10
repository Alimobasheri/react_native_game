import { useCallback, useState } from 'react';
import { ISceneProviderProps } from './types';

export const useSceneProvider = ({ defaultSceneName }: ISceneProviderProps) => {
  const [activeScenes, setActiveScenes] = useState<Record<string, boolean>>({
    [defaultSceneName]: true,
  });
  const [sceneHistory, setSceneHistory] = useState<string[]>([
    defaultSceneName,
  ]);

  const enableScene = useCallback(
    (name: string) => setActiveScenes((prev) => ({ ...prev, [name]: true })),
    [setActiveScenes]
  );
  const disableScene = useCallback(
    (name: string) => setActiveScenes((prev) => ({ ...prev, [name]: false })),
    [setActiveScenes]
  );

  const switchScene = useCallback(
    (sceneName: string, options?: { preserveHistory: boolean }) => {
      disableScene(sceneHistory[sceneHistory.length - 1]);
      enableScene(sceneName);
      if (options?.preserveHistory) {
        setSceneHistory([...sceneHistory, sceneName]);
      } else {
        setSceneHistory([sceneName]);
      }
    },
    [sceneHistory, enableScene, disableScene]
  );

  const goBack = useCallback(() => {
    if (sceneHistory.length > 1) {
      const previousScene = sceneHistory[sceneHistory.length - 2];
      disableScene(sceneHistory[sceneHistory.length - 1]);
      enableScene(previousScene);
      setSceneHistory(sceneHistory.slice(0, -1));
    }
  }, [sceneHistory, enableScene, disableScene]);

  return {
    activeScenes,
    enableScene,
    disableScene,
    switchScene,
    goBack,
  };
};
