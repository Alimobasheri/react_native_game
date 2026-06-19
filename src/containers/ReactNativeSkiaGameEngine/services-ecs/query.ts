import { ComponentStore } from './component';
import { Entity } from './entity';
import {
  SceneComponentData,
  SceneComponentName,
} from '../internal/components/scene';

/** First living entity in a dense component store, or undefined if empty. */
export const firstEntityFromStore = <T>(
  store: ComponentStore<T> | undefined
): Entity | undefined => {
  'worklet';
  if (!store || store.count() === 0) {
    return undefined;
  }
  let found: Entity | undefined;
  store.forEachEntity((entity) => {
    if (found === undefined) {
      found = entity;
    }
  });
  return found;
};

/** First living component data in a dense store, or undefined if empty. */
export const firstDataFromStore = <T>(
  store: ComponentStore<T> | undefined
): T | undefined => {
  'worklet';
  if (!store || store.count() === 0) {
    return undefined;
  }
  let found: T | undefined;
  store.forEach((_entity, data) => {
    if (found === undefined) {
      found = data;
    }
  });
  return found;
};

/** Find scene entity by sceneKey via dense store iteration (no signature scan). */
export const findSceneEntityByKey = (
  components: Record<string, ComponentStore<any>>,
  sceneKey: string
): Entity | undefined => {
  'worklet';
  const sceneStore = components[SceneComponentName];
  if (!sceneStore) {
    return undefined;
  }
  let found: Entity | undefined;
  sceneStore.forEach((entity, data: SceneComponentData) => {
    if (found === undefined && data.sceneKey === sceneKey) {
      found = entity;
    }
  });
  return found;
};
