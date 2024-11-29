import { useContext, useMemo } from 'react';
import { RNSGEContext } from '../../context/RNSGEContext';
import { Entity } from '../../services/Entity';
import { IEntityOptions } from '../../services';
import { useCurrentScene } from '../useCurrentScene/useCurrentScene';

/**
 * A React hook that adds a new entity to the game engine's entities list and returns the created entity instance.
 *
 * This hook is designed to work within the context of the React Native Skia Game Engine (RNSGE).
 * It creates a new entity with the provided data and options, adds it to the game engine's entity management system,
 * and memoizes the entity to ensure it is only created and added once.
 *
 * @template T - The type of data associated with the entity.
 *
 * @param {T} data - The data object to associate with the new entity. This data typically contains initial properties such as position, velocity, etc.
 * @param {IEntityOptions} [options] - Optional settings for the entity, such as labels and groups.
 *
 * @returns {Entity<T>} The newly created entity instance.
 *
 * @example
 * const entity = useAddEntity({ translateX: -10 });
 *
 * // Access the entity's data
 * console.log(entity.data.translateX); // Output: -10
 */
export function useAddEntity<T extends Record<string, any>>(
  data: T,
  options?: Omit<IEntityOptions, 'sceneId'>
) {
  const context = useContext(RNSGEContext);
  const { name: sceneId } = useCurrentScene();

  if (!context) {
    throw new Error('useAddEntity must be used within a RNSGEContext');
  }

  const entity = useMemo(() => {
    const entityInstance = new Entity<T>(data, { ...options, sceneId });
    context.entities.current.addEntity(entityInstance);
    return entityInstance;
  }, []);

  return entity;
}
