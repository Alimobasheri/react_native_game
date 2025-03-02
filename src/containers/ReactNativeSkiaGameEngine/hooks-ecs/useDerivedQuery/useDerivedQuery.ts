import { useEffect } from 'react';
import { DerivedSystem } from '../useDerivedMemory/useDerivedMemory';
import { useECSContext } from '../useECSContext/useECSContext';
import { useDerivedValue } from 'react-native-reanimated';

export type UseDerivedQueryArgs = {
  key: string;
  transform?: DerivedSystem['transform'];
};

export const useDerivedQuery = ({ key, transform }: UseDerivedQueryArgs) => {
  const ecsContext = useECSContext();
  useEffect(() => {
    if (transform) ecsContext.addDerivedSystem({ key, transform });
  }, [ecsContext, key, transform]);

  return useDerivedValue(() => {
    return ecsContext.derivedMemory.value[key];
  });
};
