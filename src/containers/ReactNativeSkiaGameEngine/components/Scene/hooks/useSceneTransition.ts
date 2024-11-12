import { useAnimationsController } from '@/containers/ReactNativeSkiaGameEngine/hooks/useAnimationsController/useAnimationsController';
import { ActiveAnimation } from '@/containers/ReactNativeSkiaGameEngine/services/Animations';
import { Camera } from '@/containers/ReactNativeSkiaGameEngine/types';
import { createTimingAnimation } from '@/containers/ReactNativeSkiaGameEngine/utils';
import { useEffect, useRef, useState } from 'react';
import {
  useSharedValue,
  runOnJS,
  useAnimatedReaction,
  SharedValue,
  runOnUI,
} from 'react-native-reanimated';
import { SceneTransition, TransitionPhase } from '../types/transitions';

interface ITransitionConfig {
  duration?: number;
  enterDuration?: number;
  exitDuration?: number;
}

interface IUseSceneTransitionProps {
  isActive: boolean;
  camera: Camera;
  enter?: SceneTransition | null;
  exit?: SceneTransition | null;
  config: ITransitionConfig;
}

/**
 * Hook that manages scene transitions (enter and exit animations) for a scene.
 * It provides animation properties that can be applied to the scene's root component.
 *
 * @param {boolean} isActive - Whether the scene is currently active.
 * @param {SceneTransition} enter - The transition callback for enter phase.
 * @param {SceneTransition} exit - The transition callbakc for exit phase.
 * @param {Object} config - Configuration for transition durations.
 * @param {number} [config.duration=500] - Default duration for transitions.
 * @param {number} [config.enterDuration] - Specific duration for the enter transition (overrides `duration`).
 * @param {number} [config.exitDuration] - Specific duration for the exit transition (overrides `duration`).
 *
 * @returns {object} returnObject
 * @returns {boolean} returnObject.isTransitioning - Whether the scene is currently transitioning.
 *
 * @example
 * const { props } = useSceneTransition(true, 'fade', 'slide', { duration: 300 });
 * <Rect {...props}>Scene Content</Rect>
 */
export const useSceneTransition = ({
  isActive,
  camera,
  enter = null,
  exit = null,
  config = { duration: 500 },
}: IUseSceneTransitionProps) => {
  const enterDuration = config.enterDuration ?? config.duration ?? 500;
  const exitDuration = config.exitDuration ?? config.duration ?? 500;
  const duration = isActive ? enterDuration : exitDuration;

  const { registerAnimation, removeAnimation } = useAnimationsController();

  let animation = useRef<ActiveAnimation | null>(null);

  const [isTransitioning, setIsTransitioning] = useState(false);

  const phase = useSharedValue(
    isActive ? TransitionPhase.BeforeEnter : TransitionPhase.Idle
  );
  const progress = useSharedValue(isActive ? 0 : 1);

  const isInitialRender = useRef<boolean>(true);

  useEffect(() => {
    if (duration === 0) {
      progress.value = isActive ? 1 : 0;
    } else if (!isInitialRender.current || isActive) {
      if (isActive && phase.value === TransitionPhase.Idle) {
        phase.value = TransitionPhase.BeforeEnter;
      }
      if (isActive && phase.value === TransitionPhase.BeforeEnter) {
        if (typeof enter === 'function') {
          runOnUI(enter)({ camera, phase: phase.value, progress });
        }
        phase.value = TransitionPhase.Enter;
      } else if (!isActive && phase.value === TransitionPhase.AfterEnter) {
        phase.value = TransitionPhase.BeforeExit;
        if (typeof exit === 'function') {
          runOnUI(exit)({ camera, phase: phase.value, progress });
        }
        phase.value = TransitionPhase.Exit;
      }
      setIsTransitioning(true);
      animation.current = registerAnimation(
        progress,
        createTimingAnimation(progress.value, isActive ? 1 : 0, duration),
        {
          duration,
          removeOnComplete: true,
          onDone: () => {
            runOnJS(setIsTransitioning)(false);
          },
        }
      );
    }

    isInitialRender.current = false;

    return () => {
      if (animation.current) {
        removeAnimation(animation.current);
      }
    };
  }, [isActive]);

  useAnimatedReaction(
    () => {
      return progress;
    },
    (progress) => {
      console.log('🚀 ~ progress:', progress.value, phase.value);
      if (
        typeof enter === 'function' &&
        phase.value === TransitionPhase.Enter
      ) {
        enter({ camera, phase: phase.value, progress });
      } else if (
        typeof exit === 'function' &&
        phase.value === TransitionPhase.Exit
      ) {
        exit({ camera, phase: phase.value, progress });
      }
      if (isActive && progress.value === 1)
        phase.value = TransitionPhase.AfterEnter;
      else if (!isActive && progress.value === 0)
        phase.value = TransitionPhase.Idle;
    }
  );

  return {
    isTransitioning,
  };
};
