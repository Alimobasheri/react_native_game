import { ENTITIES_KEYS } from '@/constants/configs';
import {
  createTimingAnimation,
  easeInOutQuad,
  useCanvasDimensions,
  useEntityInstance,
  useEntityMemoizedValue,
  useEntityValue,
} from '@/containers/ReactNativeSkiaGameEngine';
import { useAnimationsController } from '@/containers/ReactNativeSkiaGameEngine/hooks/useAnimationsController/useAnimationsController';
import { useCreateAnimation } from '@/containers/ReactNativeSkiaGameEngine/hooks/useCreateAnimation/useCreateAnimation';
import { useFrameEffect } from '@/containers/ReactNativeSkiaGameEngine/hooks/useFrameEffect';
import { useSceneCamera } from '@/containers/ReactNativeSkiaGameEngine/hooks/useSceneCamera/useSceneCamera';
import { ActiveAnimation } from '@/containers/ReactNativeSkiaGameEngine/services/Animations';
import { Ship } from '@/Game/Entities/Ship/Ship';
import { State } from '@/Game/Entities/State/State';
import { useCallback, useEffect } from 'react';
import {
  runOnJS,
  runOnUI,
  SharedValue,
  useAnimatedReaction,
  useSharedValue,
} from 'react-native-reanimated';

const ScaleAnimationDuration = 2000;
const TranslateAnimationDuration = 2000;

export const ActionCameraControl = () => {
  const { camera } = useSceneCamera();
  const { height, width } = useCanvasDimensions();

  if (!camera) return null;

  const { entity: shipEntity } = useEntityInstance<Ship>({
    label: ENTITIES_KEYS.SHIP,
  });

  const { entity: stateEntity } = useEntityInstance<State>({
    label: ENTITIES_KEYS.STATE,
  });

  const shipAngle = useEntityValue<Ship, number>(
    shipEntity?.current?.id as string,
    'body',
    { processor: (value) => value?.angle ?? 0 }
  );

  const isHomeScene = useEntityMemoizedValue<State, SharedValue<boolean>>(
    stateEntity?.current?.id as string,
    '_isHomeScene'
  );

  const isGamePlayExited = useEntityMemoizedValue<State, SharedValue<boolean>>(
    stateEntity?.current?.id as string,
    '_isGamePlayExited'
  );

  const {
    animation: scaleXAnimation,
    registerAnimation: registerScaleXAnimation,
    remove: removeScaleXAnimation,
  } = useCreateAnimation({
    sharedValue: camera.scaleX,
  });

  const {
    animation: scaleYAnimation,
    registerAnimation: registerScaleYAnimation,
    remove: removeScaleYAnimation,
  } = useCreateAnimation({
    sharedValue: camera.scaleY,
  });

  const createScaleXAnimation = useCallback(
    (isHome?: boolean) => {
      registerScaleXAnimation({
        isRunning: true,
        animation: createTimingAnimation(
          isHome ? 1.5 : 1.3,
          isHome ? 1.3 : 1.2,
          ScaleAnimationDuration / (isHome ? 2 : 1),
          easeInOutQuad,
          'scaleXAnimation'
        ),
        config: {
          duration: ScaleAnimationDuration / (isHome ? 2 : 1),
          removeOnComplete: true,
          label: 'scaleXAnimation',
        },
      });
    },
    [registerScaleXAnimation]
  );

  const createScaleYAnimation = useCallback(
    (isHome?: boolean) => {
      registerScaleYAnimation({
        isRunning: true,
        animation: createTimingAnimation(
          isHome ? 1.5 : 1.3,
          isHome ? 1.3 : 1.2,
          ScaleAnimationDuration / (isHome ? 2 : 1),
          easeInOutQuad,
          'scaleYAnimation'
        ),
        config: {
          duration: ScaleAnimationDuration / (isHome ? 2 : 1),
          removeOnComplete: true,
          label: 'scaleYAnimation',
        },
      });
    },
    [registerScaleYAnimation]
  );

  const {
    animationInstance: translateYAnimation,
    registerAnimation: registerTranslateAnimation,
    remove: removeTranslateAnimation,
  } = useCreateAnimation({
    sharedValue: camera.translateY,
    animation: createTimingAnimation(
      (height || 0) / 7,
      0,
      TranslateAnimationDuration,
      easeInOutQuad,
      'translateYAnimation'
    ),
    config: {
      duration: TranslateAnimationDuration,
      removeOnComplete: true,
      label: 'translateYAnimation',
    },
  });

  const {
    registerAnimation: registerRotateAnimation,
    remove: removeRotateAnimation,
  } = useCreateAnimation({
    sharedValue: camera.rotate,
  });

  useAnimatedReaction(
    () => isHomeScene?.value,
    (isHome, prevIsHome) => {
      if (camera.translateY.value !== 0) {
        if (isHome) {
          runOnJS(removeTranslateAnimation)();
          runOnJS(registerTranslateAnimation)({ isRunning: true });
        } else {
          runOnJS(removeTranslateAnimation)();
          camera.translateY.value = 0;
        }
      }
      runOnJS(removeScaleXAnimation)();
      runOnJS(removeScaleYAnimation)();
      if (isHome !== prevIsHome) {
        runOnJS(createScaleXAnimation)(isHome);
        runOnJS(createScaleYAnimation)(isHome);
      } else {
        if (camera.scaleX.value !== 1) {
          runOnJS(createScaleXAnimation)(isHome);
          runOnJS(createScaleYAnimation)(isHome);
        }
      }
    }
  );

  useFrameEffect(
    () => {
      if (!camera || !shipAngle) {
        if (camera && camera.rotate.value !== 0) {
          camera.rotate.value = 0;
        }
        return;
      }
      removeRotateAnimation();
      registerRotateAnimation({
        isRunning: true,
        animation: createTimingAnimation(
          camera.rotate.value,
          (shipAngle.value || 0) > 0
            ? Math.max(-(shipAngle.value || 0) / 4, -0.15)
            : Math.min(-(shipAngle.value || 0) / 4, 0.15),
          60,
          easeInOutQuad
        ),
        config: { duration: 60, removeOnComplete: true },
      });
    },
    [shipAngle, camera],
    100
  );

  return null;
};
