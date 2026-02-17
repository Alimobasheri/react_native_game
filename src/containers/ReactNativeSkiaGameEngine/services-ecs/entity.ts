import { SharedValue } from 'react-native-reanimated';

export type Entity = number;

export const createEntityManager = (
  nextEntityId: number,
  signatures: Record<Entity, number>,
  recycledEntities: Entity[]
) => {
  'worklet';
  return () => {
    'worklet';
    let entity: Entity;

    if (recycledEntities.length > 0) {
      entity = recycledEntities.pop() as Entity;
    } else {
      entity = nextEntityId++;
    }

    signatures[entity] = 0;
    return entity;
  };
};
