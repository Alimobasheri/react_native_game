import { useEffect } from 'react';
import { DerivedSystem } from '../useDerivedMemory/useDerivedMemory';
import { useECSContext } from '../useECSContext/useECSContext';
import {
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';

export type UseDerivedQueryArgs<T> = {
  defaultValue: T;
  transform?: DerivedSystem['transform'];
};

export const useDerivedQuery = <T>({
  defaultValue,
  transform,
}: UseDerivedQueryArgs<T>) => {
  const ecsContext = useECSContext();
  const value = useSharedValue<T>(defaultValue);

  useFrameCallback(() => {
    'worklet';
    if (!ecsContext.ecs.value || !transform) return;

    const derivedValue = transform(
      ecsContext.ecs.value?.getAllEntities(),
      ecsContext.ecs.value?.components.value
    );
    value.value = derivedValue;
  });
  return value;
};
