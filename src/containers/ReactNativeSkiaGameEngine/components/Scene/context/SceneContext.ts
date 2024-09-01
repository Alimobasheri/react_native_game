import { createContext } from 'react';

/**
 * Context value for the Scene component.
 */
export interface IScenContextValue {
  /**
   * Current active scenes.
   */
  activeScenes: Record<string, boolean>;
  /**
   * Function to enable a scene.
   * @param name - Name of the scene.
   * @returns {void}
   */
  enableScene: (name: string) => void;
  /**
   * Function to disable a scene.
   * @param name - Name of the scene.
   * @returns {void}
   */
  disableScene: (name: string) => void;
}

export const SceneContext = createContext<IScenContextValue | null>(null);
