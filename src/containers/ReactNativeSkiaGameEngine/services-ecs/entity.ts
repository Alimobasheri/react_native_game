import { makeMutable, SharedValue } from 'react-native-reanimated';

export type Entity = number;

export const createEntityManager = (
  nextEntityId: SharedValue<number>,
  signatures: SharedValue<Record<Entity, number>>
) => {
  'worklet';
  return () => {
    'worklet';
    const entity = nextEntityId.value++;
    signatures.value[entity] = 0;
    return entity;
  };
};
