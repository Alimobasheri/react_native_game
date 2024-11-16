import type { Meta, StoryObj } from '@storybook/react';
import { Scene } from './Scene';
import { ReactNativeSkiaGameEngine } from '../../RNSGE';
import { View } from 'react-native';
import { createFadeTransition } from '../../utils/transitions/createFadeTransition';
import { Image, Rect, useImage } from '@shopify/react-native-skia';
import { useCanvasDimensions, useTouchHandler } from '../../hooks';
import { useFrameEffect } from '../../hooks/useFrameEffect';
import { runOnJS, useSharedValue } from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';
import {
  FC,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { createSlideTransition } from '../../utils/transitions/createSlideTransition';
import { render } from '@testing-library/react-native';
import { createZoomTransition } from '../../utils/transitions/createZoomTransition';
import { SceneTransition, TransitionPhase } from './types/transitions';

const meta = {
  title: 'Scene',
  component: Scene,
  args: { defaultSceneName: 'gameScene', isActive: true },
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
} satisfies Meta<typeof Scene>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
  render: (args: any) => <Scene {...args} />,
};

const SceneWithTransitionControl: FC<PropsWithChildren<{ args: any }>> = ({
  args,
}) => {
  const [isActive, setIsActive] = useState<boolean>(args.isActive);
  // console.log('🚀 story ~ isActive:', isActive);
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
        {image && (
          <Image image={image} width={width || 0} height={height || 0} />
        )}
      </Scene>
    </Scene>
  );
};

const customTransitionFn: SceneTransition = ({ camera, phase, progress }) => {
  'worklet';
  switch (phase) {
    case TransitionPhase.BeforeEnter:
      camera.opacity.value = 0.5;
      camera.scaleX.value = 1.2;
      camera.scaleY.value = 1.2;
      break;
    case TransitionPhase.Enter:
      camera.opacity.value = 0.7 + progress.value * 0.3;
      if (progress.value < 0.3) {
        camera.rotate.value = progress.value * 0.2 * Math.PI;
        camera.scaleX.value = 1.2 + progress.value;
        camera.scaleY.value = 1.2 + progress.value;
      } else {
        camera.scaleX.value = 1.7 + (progress.value - 0.3) * 0.1;
        camera.scaleY.value = 1.7 + (progress.value - 0.3) * 0.1;
      }
      break;
    case TransitionPhase.Exit:
      camera.opacity.value = 0.7 + progress.value * 0.3;
      if (progress.value > 0.7) {
        camera.scaleX.value = 1.7 + (progress.value - 0.7) * 0.1;
        camera.scaleY.value = 1.7 + (progress.value - 0.7) * 0.1;
      } else {
        camera.rotate.value = progress.value * 0.2 * Math.PI;
        camera.scaleX.value = 1.2 + progress.value;
        camera.scaleY.value = 1.2 + progress.value;
      }
      break;
  }
};

export const FadeTransition: Story = {
  args: {
    isActive: true,
    defaultSceneName: 'fadeScene',
    enter: createFadeTransition(),
    exit: createFadeTransition(),
    transitionConfig: { duration: 2000 },
  },
  render: (args: any) => {
    return <SceneWithTransitionControl args={args} />;
  },
};

export const SlideTransition: Story = {
  args: {
    isActive: true,
    defaultSceneName: 'SlideScene',
    enter: createSlideTransition(),
    exit: createSlideTransition(),
    transitionConfig: { duration: 2000 },
  },
  render: (args: any) => {
    return <SceneWithTransitionControl args={args} />;
  },
};

export const ZoomTransition: Story = {
  args: {
    isActive: true,
    defaultSceneName: 'SlideScene',
    enter: createZoomTransition(),
    exit: createZoomTransition(),
    transitionConfig: { duration: 2000 },
  },
  render: (args: any) => {
    return <SceneWithTransitionControl args={args} />;
  },
};

export const CustomTransition: Story = {
  args: {
    isActive: true,
    defaultSceneName: 'CustomTransitionScene',
    enter: customTransitionFn,
    exit: customTransitionFn,
    transitionConfig: { duration: 1000 },
  },
  render: (args: any) => {
    return <SceneWithTransitionControl args={args} />;
  },
};
