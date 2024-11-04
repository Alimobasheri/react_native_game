import { Transforms2d } from '@shopify/react-native-skia';
import { DerivedValue, SharedValue } from 'react-native-reanimated';

export type Camera = {
  x: SharedValue<number>;
  y: SharedValue<number>;
  width: SharedValue<number>;
  height: SharedValue<number>;
  opacity: SharedValue<number>;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  scaleX: SharedValue<number>;
  scaleY: SharedValue<number>;
  rotate: SharedValue<number>;
  transform: DerivedValue<Transforms2d>;
};
