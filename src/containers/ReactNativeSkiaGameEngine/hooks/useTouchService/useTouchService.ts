import { useRef, useCallback, useState } from 'react';
import { uid } from '../../services';
import { GestureItem } from '../../types/gestures';

interface IGestureOptions {
  label?: string;
  groups?: string[];
}

/**
 * A React hook that provides a service for managing and composing touch gestures
 * using the `react-native-gesture-handler` library.
 *
 * This hook allows you to dynamically add, update, and remove gestures, and compose
 * them into a single gesture that can be used in the game engine or other components.
 *
 * @returns {{
 *   gestures: GestureItem[];
 *   addGesture: (gesture: GestureItem, options?: IGestureOptions) => string;
 *   removeGesture: (identifier: string | { label?: string; groups?: string[] }) => void;
 *   updateGesture: (id: string, gesture: GestureItem) => void;
 * }} - An object containing the composed gesture and functions to add, update, and remove gestures.
 *
 * @example
 * const { gestures, addGesture, removeGesture, updateGesture } = useTouchService();
 *
 * // Add a new gesture:
 * const gestureId = addGesture({gesture: Gesture.Tap().onEnd(() => {
 *   console.log('Tap gesture detected');
 * }), bound: {x: 0, y: 0, width: 100, height:100}}, { label: 'tapGesture', groups: ['group1'] });
 *
 * // Remove a gesture:
 * removeGesture({ label: 'tapGesture' });

 *
 * // Use each gesture in a GestureDetector component:
 * <GestureDetector gesture={gestures[0]}>
 *   <View>
 *     // Your components here
 *   </View>
 * </GestureDetector>
 */
export const useTouchService = () => {
  const gesturesMap = useRef<Map<string, GestureItem>>(new Map());
  const labelToGestureIdMap = useRef<Map<string, string>>(new Map());
  const groupToGestureMap = useRef<Map<string, string[]>>(new Map());

  const [gestures, setGestures] = useState<GestureItem[]>([]);

  const composeGestures = useCallback(() => {
    const gestureList = Array.from(gesturesMap.current.values());
    if (gestureList.length > 0) {
      setGestures(gestureList);
    } else {
      setGestures([]);
    }
  }, []);

  const addGesture = useCallback(
    (gesture: GestureItem, options?: IGestureOptions): string => {
      const id = uid(); // Generate unique ID
      gesturesMap.current.set(id, gesture);

      // If a label is provided, map it to the gesture ID
      if (options?.label) {
        labelToGestureIdMap.current.set(options.label, id);
      }

      // If groups are provided, map the gesture ID to each group
      if (options?.groups) {
        options.groups.forEach((group) => {
          if (!groupToGestureMap.current.has(group)) {
            groupToGestureMap.current.set(group, []);
          }
          groupToGestureMap.current.get(group)?.push(id);
        });
      }

      composeGestures();
      return id;
    },
    [composeGestures]
  );

  const removeGesture = useCallback(
    (identifier: string | { label?: string; groups?: string[] }) => {
      let idsToRemove: string[] = [];

      if (typeof identifier === 'string') {
        idsToRemove.push(identifier); // Identifier is the gesture ID
      } else {
        // Check if a label is provided
        if (identifier.label) {
          const gestureId = labelToGestureIdMap.current.get(identifier.label);
          if (gestureId) {
            idsToRemove.push(gestureId);
            labelToGestureIdMap.current.delete(identifier.label);
          }
        }

        // Check if groups are provided
        if (identifier.groups) {
          identifier.groups.forEach((group) => {
            const groupGestures = groupToGestureMap.current.get(group);
            if (groupGestures) {
              idsToRemove.push(...groupGestures);
              groupToGestureMap.current.delete(group);
            }
          });
        }
      }

      // Remove the gestures by ID
      idsToRemove.forEach((id) => {
        gesturesMap.current.delete(id);
      });

      composeGestures();
    },
    [composeGestures]
  );

  const updateGesture = useCallback(
    (id: string, gesture: GestureItem) => {
      if (gesturesMap.current.has(id)) {
        gesturesMap.current.set(id, gesture);
        composeGestures();
      }
    },
    [composeGestures]
  );

  return { gestures, addGesture, removeGesture, updateGesture };
};
