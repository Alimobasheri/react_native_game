import { SharedValue, useSharedValue } from 'react-native-reanimated';
import { Entity } from '../../services-ecs/entity';
import { ComponentStore } from '../../services-ecs/component';
import { useCallback } from 'react';
import { ECS } from '../../services-ecs/ecs';

export type DerivedTransform<T = any> = (
  entities: Entity[],
  components: Record<string, ComponentStore<any>>
) => T;

export type DerivedSystem<T = any> = {
  key: string;
  transform: DerivedTransform<T>;
};

export type UseDerivedMemoryReturnValue = {
  derivedMemory: SharedValue<Record<string, any>>;
  derivedSystems: SharedValue<DerivedSystem[]>;
  addDerivedSystem: (system: DerivedSystem) => void;
  updateDerivedMemory: (
    ECS: SharedValue<ECS | null>,
    derivedSystems: SharedValue<DerivedSystem[]>
  ) => void;
};

export const useDerivedMemory = (): UseDerivedMemoryReturnValue => {
  const derivedMemory = useSharedValue<Record<string, any>>({});
  const derivedSystems = useSharedValue<DerivedSystem[]>([]);

  const updateDerivedMemory = useCallback(
    (
      ECS: SharedValue<ECS | null>,
      derivedSystems: SharedValue<DerivedSystem[]>
    ) => {
      'worklet';
      let derivedValue: Record<string, any> | null = {};
      derivedSystems.value.forEach((system) => {
        'worklet';
        if (!ECS.value || !derivedValue) return;

        derivedValue[system.key] = system.transform(
          ECS.value.getAllEntities(),
          ECS.value?.components.value
        );
      });
      derivedMemory.value = derivedValue;
      derivedValue = null;
    },
    []
  );

  const addDerivedSystem = useCallback((system: DerivedSystem) => {
    derivedSystems.value = [...derivedSystems.value, system];
  }, []);

  return {
    derivedMemory,
    derivedSystems,
    addDerivedSystem,
    updateDerivedMemory,
  };
};
