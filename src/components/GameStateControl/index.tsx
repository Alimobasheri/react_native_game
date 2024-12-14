import { ENTITIES_KEYS } from '@/constants/configs';
import {
  useEntityMemoizedValue,
  useEntityInstance,
} from '@/containers/ReactNativeSkiaGameEngine';
import { TransitionPhase } from '@/containers/ReactNativeSkiaGameEngine/components/Scene/types/transitions';
import { useSceneTransitioning } from '@/containers/ReactNativeSkiaGameEngine/hooks/useSceneTransitioning';
import { State, IGameState } from '@/Game/Entities/State/State';
import { useEffect } from 'react';
import { runOnJS } from 'react-native-reanimated';

export const GameStateControl = () => {
  const state = useEntityMemoizedValue<State, IGameState>(
    { label: ENTITIES_KEYS.STATE },
    'state'
  );

  const { entity: stateEntityInstance } = useEntityInstance<State>({
    label: ENTITIES_KEYS.STATE,
  });

  useEffect(() => {
    if (
      !!state &&
      !state.isGamePlayExited &&
      !state.isRunning &&
      !state.isHomeScene &&
      !state.isGameOver
    ) {
      setTimeout(() => {
        if (
          !!stateEntityInstance.current &&
          !Array.isArray(stateEntityInstance.current)
        ) {
          stateEntityInstance.current.data.isRunning = true;
        }
      }, 500);
    }
  }, [
    state?.isRunning,
    state?.isHomeScene,
    state?.isGamePlayExited,
    state?.isGameOver,
  ]);

  useSceneTransitioning({
    callback: ({ progress, phase }) => {
      'worklet';
      if (phase === TransitionPhase.Enter && progress.value === 1) {
        if (
          !!state &&
          !state.isGamePlayExited &&
          !state.isRunning &&
          !state.isHomeScene &&
          !state.isGameOver
        ) {
          runOnJS(setTimeout)(() => {
            if (
              !!stateEntityInstance.current &&
              !Array.isArray(stateEntityInstance.current)
            ) {
              stateEntityInstance.current.data.isRunning = true;
            }
          }, 500);
        }
      }
    },
  });

  return null;
};
