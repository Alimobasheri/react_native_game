import { useContext, useEffect, useMemo } from 'react';
import { SceneContext } from '../context/SceneContext';

/**
 * Hook that manages the active state of a scene within the game engine.
 * It registers the scene by name and determines if the scene should be active.
 * This is used to conditionally render the scene based on its active state.
 *
 * @param {string} sceneName - The name of the scene to track.
 * @param {boolean} isActive - Whether the scene should be active initially.
 *
 * @returns {Object} Context data for the scene.
 * @returns {boolean} return.isActive - Returns `true` if the scene is currently active, otherwise `false`.
 *
 * @example
 * // Usage inside a Scene component
 * const { isActive } = useSceneContext('gameOver', true);
 * return isActive ? <Text>Game Over Scene</Text> : null;
 *
 * @throws Will throw an error if the hook is used outside of a `SceneProvider`.
 */
export const useSceneContext = (sceneName: string, isActive: boolean) => {
  const sceneContext = useContext(SceneContext);

  if (!sceneContext) {
    throw new Error('useSceneContext must be used within a SceneProvider');
  }

  const { registerScene, activeScenes } = sceneContext;

  useEffect(() => {
    // Register the scene with its active state
    registerScene(sceneName, isActive);
  }, [sceneName, isActive, registerScene]);

  // Memoize the current active state of the scene
  const currentIsActive = useMemo(
    () => activeScenes[sceneName] ?? false,
    [activeScenes, sceneName]
  );

  return { isActive: currentIsActive };
};
