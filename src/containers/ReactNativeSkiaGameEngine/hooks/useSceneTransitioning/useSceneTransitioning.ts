import { useContext } from 'react';
import { SceneTransition } from '../../components/Scene/types/transitions';
import { SceneContext } from '../../components/Scene/context';
import { useAnimatedReaction } from 'react-native-reanimated';

export interface IUseSceneTransitioningArgs {
  callback: SceneTransition;
}

/**
 * Hook that runs a callback function when the scene transition state changes.
 *
 * The callback function will be called with the current scene transition state.
 *
 * @param {IUseSceneTransitioningArgs} args
 * @param {SceneTransition} args.callback - The callback function.
 *
 * @example
 * const handleSceneTransition = (state) => {
 *   console.log('Scene transition state:', state);
 * };
 *
 * useSceneTransitioning({ callback: handleSceneTransition });
 */
export const useSceneTransitioning = ({
  callback,
}: IUseSceneTransitioningArgs) => {
  const sceneContext = useContext(SceneContext);
  if (!sceneContext) {
    throw new Error(
      'useSceneTransitioning must be used within a SceneProvider'
    );
  }
  const { sceneTransitionState } = sceneContext;
  useAnimatedReaction(
    () => sceneTransitionState?.value,
    (state) => {
      if (state) {
        callback(state);
      }
    },
    [sceneTransitionState]
  );
};
