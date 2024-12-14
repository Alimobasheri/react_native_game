import { useContext } from 'react';
import { SceneContext } from '../../components/Scene/context';

export const useCurrentScene = () => {
  const scenecontext = useContext(SceneContext);
  if (!scenecontext) {
    throw new Error('useCurrentScene must be used within a SceneProvider');
  }
  return scenecontext;
};
