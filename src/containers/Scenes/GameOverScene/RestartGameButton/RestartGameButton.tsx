import { useSceneTransitioning } from '@/containers/ReactNativeSkiaGameEngine/hooks/useSceneTransitioning';
import {
  Group,
  LinearGradient,
  Rect,
  RoundedRect,
  Text,
  useFont,
  vec,
} from '@shopify/react-native-skia';
import { FC, useCallback, useEffect, useLayoutEffect, useMemo } from 'react';
import {
  runOnJS,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';
import { ActiveAnimation } from '@/containers/ReactNativeSkiaGameEngine/services/Animations';
import { useAnimationsController } from '@/containers/ReactNativeSkiaGameEngine/hooks/useAnimationsController/useAnimationsController';
import { useTouchHandler } from '@/containers/ReactNativeSkiaGameEngine';
import { GestureItem } from '@/containers/ReactNativeSkiaGameEngine/types';
import { Gesture } from 'react-native-gesture-handler';
import { RESTART_GAME_EVENT } from '@/constants/events';
import { useDispatchEvent } from '@/containers/ReactNativeSkiaGameEngine/hooks/useDispatchEvent';

interface IRestartGameButtonProps {
  x: number;
  y: number;
}

const ButtonPadding = 10;
const RestartText = 'Restart';
const RestartTextFontSize = 24;
const RestartButtonColor = 'rgba(255, 255, 255, 0.3)';
const RestartTextColor = 'rgba(255, 255, 255, 1)';
const RestartGradientColors = [
  'rgba(255, 255, 255, 0.1)',
  'rgba(255, 255, 255, 0.6)',
  'rgba(255, 255, 255, 0.1)',
];

export const RestartGameButton: FC<IRestartGameButtonProps> = ({ x, y }) => {
  const font = useFont(
    require('../../../../../assets/fonts/Montserrat-SemiBold.ttf'),
    RestartTextFontSize
  );
  const translateY = useSharedValue(0);
  const shinePosition = useSharedValue(0);
  const { registerAnimation, removeAnimation } = useAnimationsController();
  const { addGesture, removeGesture } = useTouchHandler();
  const dispatch = useDispatchEvent();

  useSceneTransitioning({
    callback: ({ progress }) => {
      'worklet';
      translateY.value =
        y -
        (font?.getMetrics().bounds?.height || 0) / 2 -
        progress.value * (y + (font?.getMetrics().bounds?.height || 0) / 2);
    },
  });

  useLayoutEffect(() => {
    let shineAnimation: ActiveAnimation;
    if (font) {
      translateY.value = y - (font?.getMetrics().bounds?.height || 0) / 2;
      // Start the shine animation using the animations controller
      shineAnimation = registerAnimation(
        shinePosition,
        {
          update: (
            currentTime,
            sharedValue,
            progress,
            isBackward,
            onAnimate
          ) => {
            'worklet';
            sharedValue.value = progress;
            if (progress >= 1) runOnJS(onAnimate)(true);
          },
        },
        {
          duration: 500,
          loop: -1,
          loopInterval: 1000,
        }
      );
    }

    return () => {
      if (shineAnimation) {
        removeAnimation(shineAnimation);
      }
    };
  }, [font, registerAnimation, removeAnimation]);

  const transform = useDerivedValue(() => {
    return [{ translateY: translateY.value }];
  }, [translateY.value]);

  const textWidth = useMemo(() => {
    return font?.getTextWidth(RestartText) || 0;
  }, [font]);

  const textHeight = useMemo(() => {
    return RestartTextFontSize || 0;
  }, [font]);

  const buttonRect = useDerivedValue(() => {
    return {
      rx: 5,
      ry: 5,
      rect: {
        x: x - textWidth / 2 - ButtonPadding,
        y: y - textHeight * 1.25 - ButtonPadding,
        width: textWidth + ButtonPadding * 2,
        height: textHeight + ButtonPadding * 2,
      },
    };
  }, [font, textWidth, textHeight]);

  const shineStart = useDerivedValue(() => {
    return {
      x:
        buttonRect.value.rect.x +
        shinePosition.value * (buttonRect.value.rect.width + 200) -
        200,
      y: buttonRect.value.rect.y + translateY.value,
    };
  }, [buttonRect, translateY]);

  const shineEnd = useDerivedValue(() => {
    return {
      x:
        buttonRect.value.rect.x +
        shinePosition.value * (buttonRect.value.rect.width + 200),
      y:
        buttonRect.value.rect.y +
        buttonRect.value.rect.height +
        translateY.value,
    };
  }, [buttonRect, translateY]);

  const touchX = useDerivedValue(() => {
    return buttonRect.value.rect.x;
  }, [buttonRect]);
  const touchY = useDerivedValue(() => {
    return buttonRect.value.rect.y + translateY.value;
  }, [buttonRect, translateY]);
  const touchWidth = useDerivedValue(() => {
    return buttonRect.value.rect.width;
  }, [buttonRect]);
  const touchHeight = useDerivedValue(() => {
    return buttonRect.value.rect.height;
  }, [buttonRect]);
  const onTap = useCallback(() => {
    dispatch(RESTART_GAME_EVENT);
  }, [dispatch]);
  const gesture: GestureItem = useMemo(() => {
    return {
      gesture: Gesture.Tap().onFinalize(onTap).runOnJS(true),
      rect: {
        x: touchX,
        y: touchY,
        width: touchWidth,
        height: touchHeight,
      },
    };
  }, []);
  useEffect(() => {
    const gestureId = addGesture(gesture);
    return () => {
      removeGesture(gestureId);
    };
  }, [gesture]);

  if (!font) return null;

  return (
    <Group transform={transform}>
      <RoundedRect rect={buttonRect} color={RestartButtonColor}></RoundedRect>
      <RoundedRect rect={buttonRect}>
        <LinearGradient
          start={shineStart}
          end={shineEnd}
          colors={RestartGradientColors}
        />
      </RoundedRect>

      <Text
        x={x - textWidth / 2}
        y={y - textHeight / 2}
        text={RestartText}
        font={font}
        color={RestartTextColor}
        antiAlias
      />
    </Group>
  );
};
