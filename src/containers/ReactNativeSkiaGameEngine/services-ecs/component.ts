import { Entity } from './entity';

export type Component<T> = { name: string; data: T };
export type ComponentStore<T> = {
  get: (entity: Entity) => T | undefined;
  add: (entity: Entity, component: T) => void;
  remove: (entity: Entity) => void;
  update: (entity: Entity, data: T) => void;
  count: () => number;
  forEach: (fn: (entity: Entity, data: T) => void) => void;
  forEachEntity: (fn: (entity: Entity) => void) => void;
};

const MAX_PAGE_SIZE = 64;

export const createComponentStore = <T>(): ComponentStore<T> => {
  'worklet';
  const pages: Uint32Array[] = [new Uint32Array(MAX_PAGE_SIZE)];
  const dense: T[] = [];
  const entities: number[] = [];
  let size: number = 0;

  const getPage = (entity: Entity) => Math.floor(entity / MAX_PAGE_SIZE);
  const getOffset = (entity: Entity) => entity % MAX_PAGE_SIZE;

  const add = (entity: Entity, component: T) => {
    const pageIndex = getPage(entity);
    const offset = getOffset(entity);

    while (pages.length <= pageIndex) {
      pages.push(new Uint32Array(MAX_PAGE_SIZE));
    }

    if (pages[pageIndex][offset] !== 0) return;

    pages[pageIndex][offset] = size + 1;
    entities[size] = entity;
    dense[size] = component;
    size++;
  };

  const remove = (entity: Entity) => {
    const pageIndex = getPage(entity);
    const offset = getOffset(entity);

    if (pageIndex >= pages.length || pages[pageIndex][offset] === 0) return;

    const index = pages[pageIndex][offset] - 1;
    const lastEntity = entities[size - 1];
    entities[index] = lastEntity;
    dense[index] = dense[size - 1];

    const lastPageIndex = getPage(lastEntity);
    const lastOffset = getOffset(lastEntity);
    pages[lastPageIndex][lastOffset] = index + 1;

    pages[pageIndex][offset] = 0;
    size--;
  };

  const getIndex = (entity: Entity): number | undefined => {
    const pageIndex = getPage(entity);
    const offset = getOffset(entity);

    if (pageIndex >= pages.length || pages[pageIndex][offset] === 0)
      return undefined;
    return pages[pageIndex][offset] - 1;
  };

  const get = (entity: Entity) => {
    const index = getIndex(entity);
    return index !== undefined ? dense[index] : undefined;
  };

  const update = (entity: Entity, data: T) => {
    const index = getIndex(entity);
    if (index !== undefined) {
      dense[index] = data;
    }
  };

  const count = () => {
    return size;
  };

  const forEach = (fn: (entity: Entity, data: T) => void) => {
    for (let i = 0; i < size; i++) {
      fn(entities[i], dense[i]);
    }
  };

  const forEachEntity = (fn: (entity: Entity) => void) => {
    for (let i = 0; i < size; i++) {
      fn(entities[i]);
    }
  };

  return {
    get,
    add,
    remove,
    update,
    count,
    forEach,
    forEachEntity,
  };
};
