import { Camera } from '@/containers/ReactNativeSkiaGameEngine/types';
import { createTimingAnimation } from '@/containers/ReactNativeSkiaGameEngine/utils';
import { useEffect, useRef, useState } from 'react';
import {
  useSharedValue,
  runOnJS,
  useAnimatedReaction,
  runOnUI,
} from 'react-native-reanimated';
import {
  ISceneTransitionState,
  SceneTransition,
  TransitionPhase,
} from '../types/transitions';
import { useCreateAnimation } from '@/containers/ReactNativeSkiaGameEngine/hooks/useCreateAnimation/useCreateAnimation';

interface ITransitionConfig {
  duration?: number;
  enterDuration?: number;
  exitDuration?: number;
}

interface IUseSceneTransitionProps {
  isActive: boolean;
  camera: Camera;
  defaultSceneName?: string;
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
  defaultSceneName,
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

  const [isTransitioning, setIsTransitioning] = useState(false);

  const phase = useSharedValue(TransitionPhase.BeforeEnter);
  const progress = useSharedValue(0);

  const { registerAnimation, remove } = useCreateAnimation({
    sharedValue: progress,
    isRunning: false,
  });

  const sceneTransitionState = useSharedValue<ISceneTransitionState>({
    phase: TransitionPhase.BeforeEnter,
    progress: progress,
    camera: camera,
  });

  const isInitialRender = useRef<boolean>(true);

  useEffect(() => {
    if (duration === 0) {
      progress.value = isActive ? 1 : 0;
      sceneTransitionState.value = {
        phase: isActive ? TransitionPhase.Enter : TransitionPhase.Exit,
        progress: progress,
        camera: camera,
      };
      if (isActive && typeof enter === 'function') {
        runOnUI(enter)({
          camera,
          phase: TransitionPhase.Enter,
          progress,
        });
        phase.value = TransitionPhase.AfterEnter;
      } else if (!isActive && typeof exit === 'function') {
        runOnUI(exit)({
          camera,
          phase: TransitionPhase.Exit,
          progress,
        });
        phase.value = TransitionPhase.Idle;
      }
    } else if (!isInitialRender.current || isActive) {
      sceneTransitionState.value = {
        phase: isActive ? TransitionPhase.Enter : TransitionPhase.Exit,
        progress: progress,
        camera: camera,
      };
      let shouldTransition =
        (isActive && typeof enterDuration == 'number') ||
        (!isActive && typeof exitDuration == 'number');
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

      if (shouldTransition && typeof duration === 'number') {
        remove();
        setIsTransitioning(true);
        registerAnimation({
          isRunning: true,
          animation: createTimingAnimation(
            isActive ? 0 : 1,
            isActive ? 1 : 0,
            duration
          ),
          config: {
            duration,
            removeOnComplete: true,
            onDone: () => {
              runOnJS(setIsTransitioning)(false);
            },
          },
        });
      }
    }

    isInitialRender.current = false;
  }, [isActive]);

  useAnimatedReaction(
    () => {
      return progress;
    },
    (progress) => {
      'worklet';
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
      sceneTransitionState.value = {
        phase: phase.value,
        progress: progress,
        camera: camera,
      };
    },
    [progress]
  );

  return {
    isTransitioning,
    sceneTransitionState,
  };
};
