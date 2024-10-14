import { ComposedGesture, GestureType } from 'react-native-gesture-handler';
import { SharedValue } from 'react-native-reanimated';

export type Gesture = ComposedGesture | GestureType;

export interface GestureItem {
  gesture: Gesture;
  rect: {
    x: SharedValue<number>;
    y: SharedValue<number>;
    width: SharedValue<number>;
    height: SharedValue<number>;
  };
}
