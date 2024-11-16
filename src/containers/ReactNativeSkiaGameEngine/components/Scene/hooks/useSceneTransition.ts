import { useAnimationsController } from '@/containers/ReactNativeSkiaGameEngine/hooks/useAnimationsController/useAnimationsController';
import { ActiveAnimation } from '@/containers/ReactNativeSkiaGameEngine/services/Animations';
import { Camera } from '@/containers/ReactNativeSkiaGameEngine/types';
import { createTimingAnimation } from '@/containers/ReactNativeSkiaGameEngine/utils';
import { useEffect, useRef, useState } from 'react';
import {
  useSharedValue,
  runOnJS,
  useAnimatedReaction,
  runOnUI,
} from 'react-native-reanimated';
import { SceneTransition, TransitionPhase } from '../types/transitions';
import { useFrameEffect } from '@/containers/ReactNativeSkiaGameEngine/hooks/useFrameEffect';

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
  const enterDuration =
    (typeof config.enterDuration === 'number' && config.enterDuration) ||
    (typeof config.duration === 'number' && config.duration) ||
    (typeof enter === 'function' && 0);
  const exitDuration =
    (typeof config.exitDuration === 'number' && config.exitDuration) ||
    (typeof config.duration === 'number' && config.duration) ||
    (typeof exit === 'function' && 0);
  const duration = isActive ? enterDuration : exitDuration;
  console.log(
    '🚀 ~ duration:',
    isActive,
    config.enterDuration || config.duration,
    enterDuration,
    config,
    duration
  );

  const { registerAnimation, removeAnimation } = useAnimationsController();

  let animation = useRef<ActiveAnimation | null>(null);

  const [isTransitioning, setIsTransitioning] = useState(false);

  const phase = useSharedValue(TransitionPhase.BeforeEnter);
  const progress = useSharedValue(0);

  const isInitialRender = useRef<boolean>(true);

  useEffect(() => {
    if (duration === 0) {
      progress.value = isActive ? 1 : 0;
    } else if (!isInitialRender.current || isActive) {
      let shouldTransition =
        (isActive && enterDuration >= 0) || (!isActive && exitDuration >= 0);
      if (isActive && shouldTransition) {
        if (typeof enter === 'function') {
          runOnUI(enter)({
            camera,
            phase: TransitionPhase.BeforeEnter,
            progress,
          });
        }
        phase.value = TransitionPhase.Enter;
      } else if (!isActive && shouldTransition) {
        if (typeof exit === 'function') {
          runOnUI(exit)({
            camera,
            phase: TransitionPhase.BeforeExit,
            progress,
          });
        }
        phase.value = TransitionPhase.Exit;
      }

      if (shouldTransition) {
        if (animation.current) {
          removeAnimation(animation.current);
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
    }

    isInitialRender.current = false;
  }, [isActive]);

  useAnimatedReaction(
    () => {
      return progress;
    },
    (progress) => {
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
    },
    [progress.value]
  );

  return {
    isTransitioning,
  };
};
