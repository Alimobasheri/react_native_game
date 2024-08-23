import { useRef, useCallback, useState } from 'react';
import {
  ComposedGesture,
  Gesture,
  GestureType,
} from 'react-native-gesture-handler';

/**
 * A React hook that provides a service for managing and composing touch gestures
 * using the `react-native-gesture-handler` library.
 *
 * This hook allows you to dynamically add gestures and compose them into a single gesture
 * that can be used in the game engine or other components.
 *
 * @returns {{
 *   gestures: ComposedGesture;
 *   addGesture: (gesture: GestureType) => void;
 * }} - An object containing the composed gesture and a function to add new gestures.
 *
 * @example
 * const { gestures, addGesture } = useTouchService();
 *
 * // Add a new gesture:
 * addGesture(Gesture.Tap().onEnd(() => {
 *   console.log('Tap gesture detected');
 * }));
 *
 * // Use the composed gesture in a GestureDetector component:
 * <GestureDetector gesture={gestures}>
 *   <View>
 *     // Your components here
 *   </View>
 * </GestureDetector>
 */
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
