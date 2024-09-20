// useAnimationsController.ts
import { useCallback, useContext } from 'react';
import { RNSGEContext } from '../../context';
import { SharedValue } from 'react-native-reanimated';
import {
  ActiveAnimation,
  Animation,
  AnimationConfig,
  AnimationFilter,
} from '../../services/Animations';

export const useAnimationsController = () => {
  const context = useContext(RNSGEContext);

  if (!context) {
    throw new Error(
      'useAnimationsController must be used within a RNSGEContext'
    );
  }

  // Register an animation with optional config (label, group, etc.)
  const registerAnimation = useCallback(
    (
      sharedValue: SharedValue<any>,
      animation: Animation,
      config?: AnimationConfig
    ) => {
      return context.animations.current.registerAnimation(
        sharedValue,
        animation,
        config
      );
    },
    [context]
  );

  // Pause an animation by ID, label, or group
  const pauseAnimation = useCallback(
    (filter: AnimationFilter) => {
      return context.animations.current.pauseAnimation(filter);
    },
    [context]
  );

  // Resume an animation by ID, label, or group
  const resumeAnimation = useCallback(
    (filter: AnimationFilter) => {
      return context.animations.current.resumeAnimation(filter);
    },
    [context]
  );

  // Stop an animation by ID, label, or group and reset it to its original value
  const stopAnimation = useCallback(
    (filter: AnimationFilter) => {
      return context.animations.current.stopAnimation(filter);
    },
    [context]
  );

  const removeAnimation = useCallback(
    (animation: ActiveAnimation) => {
      return context.animations.current.removeAnimationFromMaps(animation);
    },
    [context]
  );

  return {
    registerAnimation,
    pauseAnimation,
    resumeAnimation,
    stopAnimation,
    removeAnimation,
  };
};
