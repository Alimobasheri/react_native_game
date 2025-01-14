import { useSceneTransitioning } from '@/containers/ReactNativeSkiaGameEngine/hooks/useSceneTransitioning';
import {
  Atlas,
  drawAsImage,
  Group,
  InputRRect,
  LinearGradient,
  rect,
  RoundedRect,
  SkFont,
  SkRect,
  SkRRect,
  Text,
  Transforms3d,
  useFont,
  useRSXformBuffer,
  useTexture,
  Vector,
} from '@shopify/react-native-skia';
import React, {
  FC,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
} from 'react';
import {
  DerivedValue,
  runOnJS,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';
import { useTouchHandler } from '@/containers/ReactNativeSkiaGameEngine';
import { GestureItem } from '@/containers/ReactNativeSkiaGameEngine/types';
import { Gesture } from 'react-native-gesture-handler';
import { RESTART_GAME_EVENT } from '@/constants/events';
import { useDispatchEvent } from '@/containers/ReactNativeSkiaGameEngine/hooks/useDispatchEvent';
import { useCreateAnimation } from '@/containers/ReactNativeSkiaGameEngine/hooks/useCreateAnimation/useCreateAnimation';

export type RestartGameButtonProps = {
  x: number;
  y: number;
};

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

export type ButtonTextureProps = {
  font: SkFont;
  buttonRect: DerivedValue<SkRRect>;
  shineStart: DerivedValue<Vector>;
  shineEnd: DerivedValue<Vector>;
  transform: DerivedValue<{ translateY: number }[]>;
} & RestartGameButtonProps;

const ButtonTexture: FC<ButtonTextureProps> = ({
  font,
  buttonRect,
  shineStart,
  shineEnd,
  x,
  y,
  transform,
}) => {
  const textX = useDerivedValue(() => {
    return x - font.measureText(RestartText).width / 2;
  });
  const textY = useDerivedValue(() => {
    return y - font.measureText(RestartText).height / 2;
  });
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
        x={textX}
        y={textY}
        text={RestartText}
        font={font}
        color={RestartTextColor}
        antiAlias
      />
    </Group>
  );
};

export const RestartGameButton: FC<RestartGameButtonProps> = ({ x, y }) => {
  const font = useFont(
    require('../../../../../assets/fonts/Montserrat-SemiBold.ttf'),
    RestartTextFontSize
  );
  const translateY = useSharedValue(0);
  const shinePosition = useSharedValue(0);
  const { addGesture, removeGesture } = useTouchHandler();
  const dispatch = useDispatchEvent();

  const { registerAnimation, remove } = useCreateAnimation({
    sharedValue: shinePosition,
    animation: {
      update: (currentTime, sharedValue, progress, isBackward, onAnimate) => {
        'worklet';
        sharedValue.value = progress;
        if (progress >= 1) runOnJS(onAnimate)(true);
      },
    },
    config: {
      duration: 500,
      loop: -1,
      loopInterval: 1000,
    },
  });

  useSceneTransitioning({
    callback: ({ progress }) => {
      'worklet';
      translateY.value =
        y -
        (font?.getMetrics().bounds?.height || 0) / 2 -
        progress.value * (y + (font?.getMetrics().bounds?.height || 0) / 2);
    },
  });

  useEffect(() => {
    if (font) {
      translateY.value = y - (font?.getMetrics().bounds?.height || 0) / 2;
      registerAnimation({ isRunning: true });
    }

    return () => {
      remove();
    };
  }, [font]);

  const transform: DerivedValue<{ translateY: number }[]> =
    useDerivedValue(() => {
      return [{ translateY: translateY.value }];
    }, [translateY]);

  const textWidth = useMemo(() => {
    return font?.measureText(RestartText).width || 0;
  }, [font]);

  const textHeight = useMemo(() => {
    return font?.measureText(RestartText).height || 0;
  }, [font]);

  const buttonRect: DerivedValue<SkRRect> = useDerivedValue(() => {
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
    <ButtonTexture
      font={font}
      buttonRect={buttonRect}
      shineStart={shineStart}
      shineEnd={shineEnd}
      x={x}
      y={y}
      transform={transform}
    />
  );
};
