import { ENTITIES_KEYS } from '@/constants/configs';
import {
  useEntityMemoizedValue,
  useEntityInstance,
  Entity,
} from '@/containers/ReactNativeSkiaGameEngine';
import { TransitionPhase } from '@/containers/ReactNativeSkiaGameEngine/components/Scene/types/transitions';
import { useSceneTransitioning } from '@/containers/ReactNativeSkiaGameEngine/hooks/useSceneTransitioning';
import { State, IGameState } from '@/Game/Entities/State/State';
import { MutableRefObject, useCallback, useEffect } from 'react';
import {
  makeMutable,
  runOnJS,
  SharedValue,
  useAnimatedReaction,
  withTiming,
} from 'react-native-reanimated';

export const GameStateControl = () => {
  const isGamePlayExited = useEntityMemoizedValue<State, SharedValue<boolean>>(
    { label: ENTITIES_KEYS.STATE },
    '_isGamePlayExited'
  ) as SharedValue<boolean>;

  const isRunning = useEntityMemoizedValue<State, SharedValue<boolean>>(
    { label: ENTITIES_KEYS.STATE },
    '_isRunning'
  ) as SharedValue<boolean>;

  const isHomeScene = useEntityMemoizedValue<State, SharedValue<boolean>>(
    { label: ENTITIES_KEYS.STATE },
    '_isHomeScene'
  ) as SharedValue<boolean>;

  const isGameOver = useEntityMemoizedValue<State, SharedValue<boolean>>(
    { label: ENTITIES_KEYS.STATE },
    '_isGameOver'
  ) as SharedValue<boolean>;

  const getCondition = useCallback(() => {
    'worklet';
    return (
      !isGamePlayExited.value &&
      !isRunning.value &&
      !isHomeScene.value &&
      !isGameOver.value
    );
  }, [isGameOver, isHomeScene, isRunning, isGamePlayExited]);

  const setIsRunningTimeout = useCallback(() => {
    setTimeout(() => {
      isRunning.value = true;
    }, 500);
  }, [isRunning]);

  // TODO: Check what should happen here
  const setIsRunningTimeoutUI = useCallback(() => {
    'worklet';
    // const timeout = makeMutable(0);
    // if (timeout.value === 0) {
    //   timeout.value = withTiming(
    //     1,
    //     {
    //       duration: 500,
    //     },
    //     (isDone) => {
    //       console.log('🚀 ~ setIsRunningTimeoutUI ~ isDone:', isDone);
    //       if (isDone) {
    //         isRunning.value = true;
    //       }
    //     }
    //   );
    // }
  }, [isRunning]);

  useAnimatedReaction(getCondition, (condition, prev) => {
    'worklet';
    if (prev !== condition && condition) {
      runOnJS(setIsRunningTimeout)();
    }
  });

  useSceneTransitioning({
    callback: ({ progress, phase }) => {
      'worklet';
      if (phase === TransitionPhase.Enter && progress.value === 1) {
        if (getCondition()) {
          setIsRunningTimeoutUI();
        }
      }
    },
  });

  return null;
};
