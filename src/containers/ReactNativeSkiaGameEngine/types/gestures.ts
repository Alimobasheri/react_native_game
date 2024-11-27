import { ComposedGesture, GestureType } from 'react-native-gesture-handler';
import { SharedValue } from 'react-native-reanimated';

export type Gesture = ComposedGesture | GestureType;
export type AnimatedValueType =
  | SharedValue<number>
  | Readonly<SharedValue<number>>;

export interface GestureItem {
  gesture: Gesture;
  rect: {
    x: AnimatedValueType;
    y: AnimatedValueType;
    width: AnimatedValueType;
    height: AnimatedValueType;
  };
}
