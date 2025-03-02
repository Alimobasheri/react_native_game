import { createContext, MutableRefObject } from 'react';
import { ECS } from '../../services-ecs/ecs';
import { SharedValue } from 'react-native-reanimated';
import { DerivedSystem } from '../../hooks-ecs/useDerivedMemory/useDerivedMemory';

export type ECSContextType = {
  ecs: SharedValue<ECS | null>;
  derivedMemory: SharedValue<Record<string, any>>;
  addDerivedSystem: (system: DerivedSystem) => void;
};

export const ECSContext = createContext<ECSContextType | undefined>(undefined);
