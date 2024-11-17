import { useContext } from 'react';
import { SceneTransition } from '../../components/Scene/types/transitions';
import { SceneContext } from '../../components/Scene/context';
import { useAnimatedReaction } from 'react-native-reanimated';

export interface IUseSceneTransitioningArgs {
  callback: SceneTransition;
}

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
