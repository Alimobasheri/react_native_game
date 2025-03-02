import {
  FC,
  MutableRefObject,
  PropsWithChildren,
  useEffect,
  useMemo,
} from 'react';
import { ECS } from '../../services-ecs/ecs';
import { ECSContext } from './ECSContext';
import { MemoizedContainer } from '../../components/MemoizedContainer';
import { SharedValue } from 'react-native-reanimated';
import { DerivedSystem } from '../../hooks-ecs/useDerivedMemory/useDerivedMemory';

export type ECSProviderProps = {
  ecs: SharedValue<ECS | null>;
  derivedMemory: SharedValue<Record<string, any>>;
  addDerivedSystem: (system: DerivedSystem) => void;
};

export const ECSProvider: FC<PropsWithChildren<ECSProviderProps>> = ({
  children,
  ecs,
  derivedMemory,
  addDerivedSystem,
}) => {
  const value = useMemo(
    () => ({
      ecs,
      derivedMemory,
      addDerivedSystem,
    }),
    [ecs, derivedMemory, addDerivedSystem]
  );
  return <ECSContext.Provider value={value}>{children}</ECSContext.Provider>;
};
