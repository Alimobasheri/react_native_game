import { useContext } from 'react';
import { SceneContext } from '../context';

export const useScene = () => {
  const seceneContext = useContext(SceneContext);
  if (!seceneContext) {
    throw new Error('useScene must be used within a SceneProvider');
  }
  const { enableScene, disableScene, activeScenes } = seceneContext;
  return { enableScene, disableScene, activeScenes };
};
