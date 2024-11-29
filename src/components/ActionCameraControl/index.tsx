import { ENTITIES_KEYS } from '@/constants/configs';
import {
  createTimingAnimation,
  easeInOutQuad,
  useEntityInstance,
  useEntityMemoizedValue,
  useEntityValue,
} from '@/containers/ReactNativeSkiaGameEngine';
import { useAnimationsController } from '@/containers/ReactNativeSkiaGameEngine/hooks/useAnimationsController/useAnimationsController';
import { useFrameEffect } from '@/containers/ReactNativeSkiaGameEngine/hooks/useFrameEffect';
import { useSceneCamera } from '@/containers/ReactNativeSkiaGameEngine/hooks/useSceneCamera/useSceneCamera';
import { ActiveAnimation } from '@/containers/ReactNativeSkiaGameEngine/services/Animations';
import { Ship } from '@/Game/Entities/Ship/Ship';
import { State } from '@/Game/Entities/State/State';
import { useEffect } from 'react';
import { useSharedValue } from 'react-native-reanimated';

const ScaleAnimationDuration = 2000;
const TranslateAnimationDuration = 2000;

export const ActionCameraControl = () => {
  const { camera } = useSceneCamera();
  const { registerAnimation, removeAnimation } = useAnimationsController();

  const registeredAnimation = useSharedValue<ActiveAnimation | null>(null);
  const registeredScaleXAnimation = useSharedValue<ActiveAnimation | null>(
    null
  );
  const registeredScaleYAnimation = useSharedValue<ActiveAnimation | null>(
    null
  );
  const registeredTranslateAnimation = useSharedValue<ActiveAnimation | null>(
    null
  );

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

  const isHomeScene = useEntityMemoizedValue<State, boolean>(
    stateEntity?.current?.id as string,
    'isHomeScene'
  );

  useEffect(() => {
    if (!camera) return;
    if (registeredScaleXAnimation.value)
      removeAnimation(registeredScaleXAnimation.value);
    if (registeredScaleYAnimation.value)
      removeAnimation(registeredScaleYAnimation.value);

    registeredScaleXAnimation.value = registerAnimation(
      camera.scaleX,
      createTimingAnimation(
        camera.scaleX.value,
        isHomeScene ? 1.5 : 1.2,
        ScaleAnimationDuration,
        easeInOutQuad
      ),
      { duration: ScaleAnimationDuration, removeOnComplete: true }
    );
    registeredScaleYAnimation.value = registerAnimation(
      camera.scaleY,
      createTimingAnimation(
        camera.scaleY.value,
        isHomeScene ? 1.5 : 1.2,
        ScaleAnimationDuration,
        easeInOutQuad
      ),
      { duration: ScaleAnimationDuration, removeOnComplete: true }
    );

    if (registeredTranslateAnimation.value)
      removeAnimation(registeredTranslateAnimation.value);
    if (camera.translateY.value !== 0) {
      registeredTranslateAnimation.value = registerAnimation(
        camera.translateY,
        createTimingAnimation(
          camera.translateY.value,
          0,
          TranslateAnimationDuration,
          easeInOutQuad
        ),
        {
          delay: 1000,
          duration: TranslateAnimationDuration,
          removeOnComplete: true,
        }
      );
    }
  }, [isHomeScene, camera]);

  useFrameEffect(
    () => {
      if (!camera || !shipAngle) {
        if (camera && camera.rotate.value !== 0) {
          camera.rotate.value = 0;
        }
        return;
      }
      if (registeredAnimation.value) removeAnimation(registeredAnimation.value);
      registeredAnimation.value = registerAnimation(
        camera.rotate,
        createTimingAnimation(
          camera.rotate.value,
          -(shipAngle.value || 0) / 4,
          60,
          easeInOutQuad
        ),
        { duration: 60, removeOnComplete: true }
      );
    },
    [shipAngle, camera],
    100
  );

  return null;
};
