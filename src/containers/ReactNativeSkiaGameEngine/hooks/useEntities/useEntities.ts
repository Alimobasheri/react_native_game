import { useRef } from 'react';
import { Entities } from '../../services/Entities';

/**
 * A React hook that provides a stable reference to a singleton instance of the `Entities` class,
 * used for managing entities within the game engine.
 *
 * This hook ensures that the `Entities` instance persists across renders,
 * allowing it to manage and track entities consistently throughout the lifecycle of the game.
 *
 * @returns {React.MutableRefObject<Entities>} - A reference to the `Entities` instance.
 *
 * @example
 * const entities = useEntities();
 *
 * // Access the Entities instance:
 * const allEntities = entities.current.entities;
 *
 * // Add a new entity:
 * entities.current.addEntity(newEntity, { label: "player" });
 */
export const useEntities = () => {
  const entitiesRef = useRef<Entities>(new Entities());
  return entitiesRef;
};
