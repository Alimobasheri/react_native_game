import type { Meta, StoryObj } from '@storybook/react';
import {
  FC,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { View } from 'react-native';
import { ReactNativeSkiaGameEngine } from '../../RNSGE';
import { Scene } from '../../components/Scene/Scene';
import { useCanvasDimensions } from '../useCanvasDimensions';
import { useSceneTransitioning } from './useSceneTransitioning';
import {
  SceneTransition,
  TransitionPhase,
} from '../../components/Scene/types/transitions';
import { Image, Rect, useImage } from '@shopify/react-native-skia';
import { runOnJS, useSharedValue } from 'react-native-reanimated';
import { useTouchHandler } from '../useTouchHandler';
import { Gesture } from 'react-native-gesture-handler';

const SceneWithTransitionControl: FC<PropsWithChildren<{ args: any }>> = ({
  args,
  children,
}) => {
  const [isActive, setIsActive] = useState<boolean>(args.isActive);
  const { width, height } = useCanvasDimensions();
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const touchWidth = useSharedValue(100);
  const touchHeight = useSharedValue(100);
  const { addGesture, removeGesture, updateGesture } = useTouchHandler();
  const gestureId = useSharedValue<null | string>(null);
  const image = useImage(require('../../../../../assets/scene_bg.webp'));
  const gestureCallback = useCallback(() => {
    'worklet';
    runOnJS(setIsActive)(!isActive);
  }, [isActive]);
  const gesture = useMemo(() => {
    return {
      gesture: Gesture.Tap().onFinalize(gestureCallback),
      rect: {
        x,
        y,
        width: touchWidth,
        height: touchHeight,
      },
    };
  }, [gestureCallback]);
  useEffect(() => {
    gestureId.value = addGesture(gesture);
    return () => {
      if (gestureId.value) removeGesture(gestureId.value);
    };
  }, [gesture]);
  if (!image) return null;
  return (
    <Scene
      isActive={true}
      defaultSceneName="wrapper"
      width={width || 0}
      height={height || 0}
    >
      <Rect x={x} y={y} width={touchWidth} height={touchHeight} />
      <Scene {...args} isActive={isActive} width={width} height={height}>
        {children}
      </Scene>
    </Scene>
  );
};

const CustomTransitionComponent: FC<PropsWithChildren> = ({ children }) => {
  const { width, height } = useCanvasDimensions();
  const imageX = useSharedValue(0);
  const imageY = useSharedValue(0);
  const imageWidth = useSharedValue(width || 0);
  const imageHeight = useSharedValue(height || 0);
  const onTransition: SceneTransition = useCallback(
    ({ camera, phase, progress }) => {
      'worklet';
      switch (phase) {
        case TransitionPhase.Enter:
          camera.scaleX.value = 1 + progress.value * 0.2;
          camera.scaleY.value = 1 + progress.value * 0.2;
          camera.opacity.value = 1;
          imageX.value -= (progress.value * imageWidth.value) / 100;
          imageY.value -= (progress.value * imageHeight.value) / 100;
          break;
        case TransitionPhase.Exit:
          camera.opacity.value = progress.value;
          camera.scaleX.value = 1 + progress.value * 0.2;
          camera.scaleY.value = 1 + progress.value * 0.2;
          imageX.value += (progress.value * imageWidth.value) / 100;
          imageY.value += (progress.value * imageHeight.value) / 100;
          break;
      }
    },
    []
  );
  useSceneTransitioning({
    callback: onTransition,
  });
  const image = useImage(require('../../../../../assets/scene_bg.webp'));
  if (!image) return null;
  return (
    <Image
      image={image}
      x={imageX}
      y={imageY}
      width={imageWidth}
      height={imageHeight}
    />
  );
};

const meta = {
  title: 'UseSceneTransitioning',
  component: SceneWithTransitionControl,
  args: {
    args: { isActive: true },
  },
  decorators: [
    (Story: any) => (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ flex: 1, width: '100%', height: '100%' }}>
          <ReactNativeSkiaGameEngine onEventListeners={{}}>
            <Story />
          </ReactNativeSkiaGameEngine>
        </View>
      </View>
    ),
  ],
} satisfies Meta<typeof SceneWithTransitionControl>;

export default meta;

type Story = StoryObj<typeof meta>;

export const CustomBasicTransition: Story = {
  render: (args: any) => {
    return (
      <SceneWithTransitionControl args={args}>
        <CustomTransitionComponent />
      </SceneWithTransitionControl>
    );
  },
};
