import { useContext } from 'react';
import { SceneContext } from '../../components/Scene/context';

export const useSceneCamera = () => {
  const sceneContext = useContext(SceneContext);
  if (!sceneContext) {
    throw new Error('useSceneCamera must be used within a SceneProvider');
  }
  return {
    camera: sceneContext.sceneCamera,
  };
};
