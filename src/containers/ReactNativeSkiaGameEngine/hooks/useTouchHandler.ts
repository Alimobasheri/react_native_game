import { useCallback, useContext, useEffect } from 'react';
import { RNSGEContext } from '../context/RNSGEContext';
import { GestureType } from 'react-native-gesture-handler';

export const useTouchHandler = (gesture?: GestureType) => {
  const { touchService } = useContext(RNSGEContext);

  useEffect(() => {
    if (gesture) {
      touchService.addGesture(gesture);
    }
  }, [gesture, touchService]);

  const addGesture = useCallback(
    (gesture: GestureType) => {
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
    (id: string, gesture: GestureType) => {
      touchService.updateGesture(id, gesture);
    },
    [touchService]
  );

  return { addGesture, removeGesture, updateGesture };
};
