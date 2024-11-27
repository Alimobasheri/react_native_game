import { Camera } from '@/containers/ReactNativeSkiaGameEngine/types';
import { createContext } from 'react';
import { ISceneTransitionState } from '../types/transitions';
import { SharedValue } from 'react-native-reanimated';

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
  /**
   * Function to switch to a scene.
   * @param name - Name of the scene.
   * @param options - Options for preserving the history.
   * @returns {void}
   */
  switchScene: (name: string, options?: { preserveHistory: boolean }) => void;
  /**
   * Function to go back to the previous scene.
   * @returns {void}
   */
  goBack: () => void;
  /**
   * Function to register a scene.
   * @param name - Name of the scene.
   * @param isActive - Whether the scene is active.
   * @returns {void}
   */
  registerScene: (name: string, isActive: boolean) => void;
  /**
   * The anme of the scene that is rendering this sceneProvider
   **/
  name: string;
  /**
   * Reference Of the camera registered for the current Scene.
   */
  sceneCamera: Camera | null;
  /**
   * A sharedValue including lates Transition Phase, Transition Progress and A Reference Of the camera registered for the current Scene.
   */
  sceneTransitionState: SharedValue<ISceneTransitionState> | null;
}

export const SceneContext = createContext<IScenContextValue | null>(null);
