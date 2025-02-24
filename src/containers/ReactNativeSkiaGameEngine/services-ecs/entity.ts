import { makeMutable, SharedValue } from 'react-native-reanimated';

export type Entity = number;

export const createEntityManager = (
  nextEntityId: SharedValue<number>,
  signatures: SharedValue<Record<Entity, number>>,
  recycledEntities: Entity[]
) => {
  'worklet';
  return () => {
    'worklet';
    let entity: Entity;

    if (recycledEntities.length > 0) {
      entity = recycledEntities.pop() as Entity;
    } else {
      entity = nextEntityId.value++;
    }

    signatures.value[entity] = 0;
    return entity;
  };
};
