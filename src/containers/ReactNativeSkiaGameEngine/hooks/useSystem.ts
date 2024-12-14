import { useContext, useEffect } from 'react';
import { system as TSystem } from '../services/Systems';
import { RNSGEContext } from '../context/RNSGEContext';
import { useCurrentScene } from './useCurrentScene/useCurrentScene';

export function useSystem(system: TSystem) {
  const rnsgeContext = useContext(RNSGEContext);
  const currentScene = useCurrentScene();

  if (!rnsgeContext) {
    throw new Error('useSystem must be used within a RNSGEContext');
  }

  const systems = rnsgeContext.systems;

  useEffect(() => {
    const id = systems.current.addSystem(system, {
      sceneId: currentScene.name,
    });
    return () => {
      systems.current.removeSystem(id);
    };
  }, [system]);
}
