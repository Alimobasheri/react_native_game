import { useCallback, useContext, useEffect } from 'react';
import { RNSGEContext } from '../context/RNSGEContext';
import { GestureItem } from '../types/gestures';

export const useTouchHandler = (gesture?: GestureItem) => {
  const rnsgeContext = useContext(RNSGEContext);

  if (!rnsgeContext) {
    throw new Error('useTouchHandler must be used within a RNSGEProvider');
  }

  const { touchService } = rnsgeContext;

  useEffect(() => {
    if (gesture) {
      touchService.addGesture(gesture);
    }
  }, [gesture, touchService]);

  const addGesture = useCallback(
    (gesture: GestureItem) => {
      return touchService.addGesture(gesture);
    },
    [touchService]
  );

  const removeGesture = useCallback(
    (identifier: string | { label?: string; groups?: string[] }) => {
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
