import { createContext, MutableRefObject } from 'react';
import { ECS } from '../../services-ecs/ecs';
import { SharedValue } from 'react-native-reanimated';

export type ECSContextType = {
  ecs: SharedValue<ECS | null>;
};

export const ECSContext = createContext<ECSContextType | undefined>(undefined);
