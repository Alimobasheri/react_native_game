import { useRef, useCallback, useState } from "react";
import {
  ComposedGesture,
  Gesture,
  GestureType,
} from "react-native-gesture-handler";

export const useTouchService = () => {
  const gesturesArray = useRef<(ComposedGesture | GestureType)[]>([]);
  const [gestures, setGestures] = useState<ComposedGesture>(
    Gesture.Race(...gesturesArray.current)
  );

  const addGesture = useCallback(
    (gesture: GestureType) => {
      gesturesArray.current.push(gesture);
      setGestures(Gesture.Race(...gesturesArray.current));
    },
    [gesturesArray, setGestures]
  );
  return { gestures, addGesture };
};
