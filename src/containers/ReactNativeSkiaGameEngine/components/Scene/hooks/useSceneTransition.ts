import { useAnimationsController } from '@/containers/ReactNativeSkiaGameEngine/hooks/useAnimationsController/useAnimationsController';
import { ActiveAnimation } from '@/containers/ReactNativeSkiaGameEngine/services/Animations';
import { Camera } from '@/containers/ReactNativeSkiaGameEngine/types';
import { createTimingAnimation } from '@/containers/ReactNativeSkiaGameEngine/utils';
import { useEffect, useRef, useState } from 'react';
import {
  useSharedValue,
  runOnJS,
  useAnimatedReaction,
} from 'react-native-reanimated';

interface ITransitionConfig {
  duration?: number;
  enterDuration?: number;
  exitDuration?: number;
}

interface IUseSceneTransitionProps {
  isActive: boolean;
  camera: Camera;
  enter: 'fade' | 'slide' | 'zoom' | null;
  exit: 'fade' | 'slide' | 'zoom' | null;
  config: ITransitionConfig;
}

/**
 * Hook that manages scene transitions (enter and exit animations) for a scene.
 * It provides animation properties that can be applied to the scene's root component.
 *
 * @param {boolean} isActive - Whether the scene is currently active.
 * @param {'fade'|'slide'|'zoom'} enter - The transition effect when the scene enters.
 * @param {'fade'|'slide'|'zoom'} exit - The transition effect when the scene exits.
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

  const progress = useSharedValue(isActive ? 0 : 1);

  const isInitialRender = useRef<boolean>(true);

  useEffect(() => {
    if (duration === 0) {
      progress.value = isActive ? 1 : 0;
    } else if (!isInitialRender.current || isActive) {
      setIsTransitioning(true);
      registerAnimation(
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

    if (enter === 'fade' || exit === 'fade') {
      camera.opacity.value = progress.value;
    } else {
      camera.opacity.value = 1;
    }
    if (enter === 'slide' || exit === 'slide') {
      camera.translateY.value = (1 - progress.value) * 300;
    }
    if (enter === 'zoom' || exit === 'zoom') {
      camera.scaleX.value = 1 + (1 - progress.value) * 0.5;
      camera.scaleY.value = 1 + (1 - progress.value) * 0.5;
    } else {
      camera.scaleX.value = 1;
      camera.scaleY.value = 1;
      camera.translateY.value = 0;
    }

    return () => {
      if (animation.current) {
        removeAnimation(animation.current);
      }
    };
  }, [isActive]);

  useAnimatedReaction(
    () => {
      return progress.value;
    },
    (progress) => {
      if (enter === 'fade' || exit === 'fade') {
        camera.opacity.value = progress;
      } else {
        camera.opacity.value = 1;
      }
      if (enter === 'slide' || exit === 'slide') {
        camera.translateY.value = (1 - progress) * 300;
      } else {
        camera.translateY.value = 0;
      }
      if (enter === 'zoom' || exit === 'zoom') {
        camera.scaleX.value = 1 + (1 - progress) * 0.5;
        console.log('🚀 ~ camera.scaleX.value:', camera.scaleX.value);
        camera.scaleY.value = 1 + (1 - progress) * 0.5;
        console.log('🚀 ~ camera.scaleY.value:', camera.scaleY.value);
      } else {
        camera.scaleX.value = 1;
        camera.scaleY.value = 1;
      }
    }
  );

  return {
    isTransitioning,
  };
};
