import { useContext, useMemo } from 'react';
import { SceneContext } from '../context';
import { ISceneProps } from '../Scene';

export const useSceneContext = ({ defaultSceneName }: ISceneProps) => {
  const seceneContext = useContext(SceneContext);
  if (!seceneContext) {
    throw new Error('useSceneContext must be used within a SceneProvider');
  }
  const { activeScenes } = seceneContext;
  const isActive = useMemo(
    () => activeScenes[defaultSceneName] ?? false,
    [activeScenes?.[defaultSceneName]]
  );

  return { isActive };
};
