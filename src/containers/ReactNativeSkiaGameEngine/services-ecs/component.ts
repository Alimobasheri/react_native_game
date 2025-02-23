import { Entity } from './entity';

export type Component<T> = { name: string; data: T };
export type ComponentStore<T> = {
  get: (entity: Entity) => T | undefined;
  add: (entity: Entity, component: T) => void;
  remove: (entity: Entity) => void;
};

export const createComponentStore = <T>(maxSize = 64): ComponentStore<T> => {
  'worklet';
  const sparse: Uint32Array<ArrayBuffer> = new Uint32Array(maxSize);
  const dense: T[] = [];
  const entities: number[] = [];
  let size: number = 0;

  const add = (entity: Entity, component: T) => {
    'worklet';
    if (sparse[entity] !== 0) return;

    sparse[entity] = size + 1;
    entities[size] = entity;
    dense[size] = component;
    size++;
  };

  const remove = (entity: Entity) => {
    'worklet';
    const index = sparse[entity] - 1;
    if (index < 0) return;

    const lastEntity = entities[size - 1];

    entities[index] = lastEntity;
    dense[index] = dense[size - 1];

    sparse[lastEntity] = index + 1;
    sparse[entity] = 0;

    size--;
  };

  const get = (entity: Entity) => {
    'worklet';
    const index = sparse[entity] - 1;
    if (index < 0) return;
    return dense[index];
  };

  return {
    get,
    add,
    remove,
  };
};
