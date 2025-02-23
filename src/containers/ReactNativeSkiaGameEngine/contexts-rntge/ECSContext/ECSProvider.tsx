import { FC, MutableRefObject, PropsWithChildren, useMemo } from 'react';
import { ECS } from '../../services-ecs/ecs';
import { ECSContext } from './ECSContext';
import { MemoizedContainer } from '../../components/MemoizedContainer';
import { SharedValue } from 'react-native-reanimated';

export type ECSProviderProps = {
  ecs: SharedValue<ECS | null>;
};

export const ECSProvider: FC<PropsWithChildren<ECSProviderProps>> = ({
  children,
  ecs,
}) => {
  const valueMemo = useMemo(() => ({ ecs }), [ecs]);
  return (
    <ECSContext.Provider value={valueMemo}>
      <MemoizedContainer>{children}</MemoizedContainer>
    </ECSContext.Provider>
  );
};
