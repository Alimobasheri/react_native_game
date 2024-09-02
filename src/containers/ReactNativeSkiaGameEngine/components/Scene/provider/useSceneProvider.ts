import { useCallback, useState } from 'react';
import { ISceneProviderProps } from './types';

export const useSceneProvider = ({ defaultSceneName }: ISceneProviderProps) => {
  const [activeScenes, setActiveScenes] = useState<Record<string, boolean>>({
    [defaultSceneName]: true,
  });

  const enableScene = useCallback(
    (name: string) => setActiveScenes((prev) => ({ ...prev, [name]: true })),
    [setActiveScenes]
  );
  const disableScene = useCallback(
    (name: string) => setActiveScenes((prev) => ({ ...prev, [name]: false })),
    [setActiveScenes]
  );

  return {
    activeScenes,
    enableScene,
    disableScene,
  };
};
