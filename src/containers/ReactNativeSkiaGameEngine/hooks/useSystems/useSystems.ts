import { useRef } from 'react';
import { Systems } from '../../services/Systems';

/**
 * A React hook that provides a stable reference to a singleton instance of the `Systems` class,
 * used for managing and executing systems within the game engine.
 *
 * This hook ensures that the `Systems` instance persists across renders,
 * allowing it to manage and execute systems consistently throughout the lifecycle of the game.
 *
 * @returns {React.MutableRefObject<Systems>} - A reference to the `Systems` instance.
 *
 * @example
 * const systems = useSystems();
 *
 * // Access the Systems instance:
 * const allSystems = systems.current;
 *
 * // Add a new system:
 * systems.current.addSystem((entities, args) => {
 *   // System logic here
 * });
 *
 * // Run all systems:
 * systems.current.update(entities, args);
 */
export const useSystems = () => {
  const systemsRef = useRef<Systems>(new Systems());
  return systemsRef;
};
