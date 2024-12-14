import { useCallback, useContext, useEffect } from 'react';
import { RNSGEContext } from '../context/RNSGEContext';
import { GestureItem } from '../types/gestures';
import { useCurrentScene } from './useCurrentScene/useCurrentScene';
import { IScenContextValue } from '../components/Scene/context';

export const useTouchHandler = (gesture?: GestureItem) => {
  const rnsgeContext = useContext(RNSGEContext);
  let currentScene: IScenContextValue | null;
  try {
    currentScene = useCurrentScene();
  } catch (error) {
    currentScene = null;
  }

  if (!rnsgeContext) {
    throw new Error('useTouchHandler must be used within a RNSGEProvider');
  }

  const { touchService } = rnsgeContext;

  useEffect(() => {
    if (gesture) {
      touchService.addGesture(gesture, { sceneId: currentScene?.name });
    }
  }, [gesture, touchService]);

  const addGesture = useCallback(
    (gesture: GestureItem) => {
      return touchService.addGesture(gesture, { sceneId: currentScene?.name });
    },
    [touchService]
  );

  const removeGesture = useCallback(
    (
      identifier:
        | string
        | { label?: string; groups?: string[]; sceneId: string }
    ) => {
      touchService.removeGesture(identifier);
    },
    [touchService]
  );

  const updateGesture = useCallback(
    (id: string, gesture: GestureItem) => {
      touchService.updateGesture(id, gesture);
    },
    [touchService]
  );

  return { addGesture, removeGesture, updateGesture };
};
