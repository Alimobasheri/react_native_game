import type { Meta, StoryObj } from '@storybook/react';
import { ReactNativeSkiaGameEngine } from './RNSGE';
import { Text, View } from 'react-native';
import { FC, useCallback, useEffect, useMemo, useRef } from 'react';
import { useAddEntity } from './hooks/useAddEntity';
import Animated, {
  runOnJS,
  runOnUI,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useEntityValue } from './hooks/useEntityValue';
import { useSystem } from './hooks/useSystem';
import { Entities } from './services/Entities';
import { SeaGroup } from '@/components/SeaGroupRenderer/SeaGroup-rnsge';
import { useReRenderCount } from '@/hooks/useReRenderCount';
import { Canvas, Rect, rect } from '@shopify/react-native-skia';
import { SkyBackground } from '@/components/SkyBackground';
import { StarsView } from '@/components/StarsView/StarsView-rnsge';
import { Physics } from '@/components/Physics';
import { Swipe } from '@/components/Swipe';
import { Collisions } from '@/components/Collisions';
import {
  useCanvasDimensions,
  useEntityInstance,
  useTouchHandler,
} from './hooks';
import { Gesture } from 'react-native-gesture-handler';
import { useFrameEffect } from './hooks/useFrameEffect';
import { StateEntity } from '@/components/State';
import { StartingScene } from '../Scenes/StartingScene';
import { Scene } from './components/Scene/Scene';
import { useSceneCamera } from './hooks/useSceneCamera/useSceneCamera';
import { ENTITIES_KEYS } from '@/constants/configs';
import { Ship } from '@/Game/Entities/Ship/Ship';
import { useAnimationsController } from './hooks/useAnimationsController/useAnimationsController';
import { ActiveAnimation } from './services/Animations';
import { createTimingAnimation, easeInOutQuad } from './utils';
import { create } from 'zustand';
import { createFadeTransition } from './utils/transitions/createFadeTransition';
import { InitialGameState } from '@/constants/gameState';
import { useCreateState } from '@/Game/Entities/State/useCreateState';

const SubComponent: FC<{}> = (props) => {
  const renderCount = useReRenderCount();
  console.log(`rendered subComponent1 for ${renderCount.current} times`);
  return <Text>Sub Component 1</Text>;
};

const SubComponentTwo: FC<{}> = (props) => {
  const renderCount = useReRenderCount();
  const entity = useAddEntity({ translateX: -10 });
  const translateX = useEntityValue<{ translateX: number }, number>(
    entity.id,
    'translateX'
  );
  console.log(`rendered subComponent2 for ${renderCount.current} times`);

  const updateTranslateX = useCallback((entities: Entities['entities']) => {
    'worklet';
    const target = entities.get(entity.id);
    if (target) {
      if (target.data.translateX < 200) target.data.translateX += 1;
    }
  }, []);
  useSystem((entities) => {
    updateTranslateX(entities.entities);
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value ? translateX.value : 0 }],
    };
  }, [translateX.value]);
  return (
    <Animated.View style={animatedStyle}>
      <Text>Sub Component 2</Text>
    </Animated.View>
  );
};

const meta = {
  title: 'React Native Skia Game Engine',
  component: ReactNativeSkiaGameEngine,
  args: {},
} satisfies Meta<typeof ReactNativeSkiaGameEngine>;

export default meta;

type Story = StoryObj<typeof meta>;

const GameScene = () => {
  const dimensions = useCanvasDimensions();
  if (!dimensions?.width || !dimensions?.height) return null;
  useCreateState({
    ...InitialGameState,
  });
  return (
    <Scene
      defaultSceneName={'gameScene'}
      isActive={true}
      x={0}
      y={0}
      width={dimensions.width}
      height={dimensions.height}
      exit={createFadeTransition()}
      transitionConfig={{ duration: 1000 }}
    >
      <Scene
        defaultSceneName={'gamePlayScene'}
        isActive={true}
        x={0}
        y={0}
        width={dimensions.width}
        height={dimensions.height}
        defaultCameraProps={{
          scaleX: 1.2,
          scaleY: 1.2,
        }}
      >
        <SkyBackground />
        <StarsView />
        <SeaGroup />
        <Physics />
        <Collisions />
        <Swipe />
        <CameraControlView />
      </Scene>
      <StartingScene />
    </Scene>
  );
};

export const Basic: Story = {
  args: {
    onEventListeners: {},
  },
  render: (args: any) => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ flex: 1, width: '100%', height: '100%' }}>
        <ReactNativeSkiaGameEngine {...args}>
          <GameScene />
        </ReactNativeSkiaGameEngine>
      </View>
    </View>
  ),
};

const Gestures = () => {
  const { width: canvasWidth, height: canvasHeight } = useCanvasDimensions();
  const touchHandler = useTouchHandler();
  const cbIndex = useRef(0);
  const registered = useSharedValue<false | string>(false);

  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const width = useSharedValue(100);
  const height = useSharedValue(100);

  const switchGesture = useCallback(
    (which: number) => {
      if (!registered.value) return;
      touchHandler.removeGesture(registered.value);
      if (which === 1) {
        registered.value = touchHandler.addGesture(gesture2);
      } else {
        registered.value = touchHandler.addGesture(gesture1);
      }
    },
    [touchHandler.addGesture, touchHandler.removeGesture]
  );

  const changeRect = useCallback(() => {
    'worklet';
    x.value = Math.random() * (canvasWidth || 0);
    y.value = Math.random() * (canvasHeight || 0);
  }, [canvasWidth, canvasHeight]);

  const cb1 = useCallback(() => {
    'worklet';
    if (!registered.value) return;
    console.log('cb1');
    changeRect();
    runOnJS(switchGesture)(1);
  }, [switchGesture]);
  const cb2 = useCallback(() => {
    'worklet';
    if (!registered.value) return;
    console.log('cb2');
    changeRect();
    runOnJS(switchGesture)(2);
  }, [switchGesture]);

  const gesture1 = useMemo(() => {
    return {
      gesture: Gesture.Tap().onStart(cb1),
      rect: {
        x,
        y,
        width,
        height,
      },
    };
  }, [cb1]);

  const gesture2 = useMemo(() => {
    return {
      gesture: Gesture.Tap().onStart(cb2),
      rect: {
        x,
        y,
        width,
        height,
      },
    };
  }, [cb2]);

  useFrameEffect(() => {
    if (!registered.value) {
      if (cbIndex.current === 0) {
        registered.value = touchHandler.addGesture(gesture1);
        cbIndex.current = 1;
      }
    }
  }, [touchHandler, gesture1, gesture2]);

  return <Rect x={x} y={y} height={height} width={width} color="blue" />;
};

export const GesturesRenderer: Story = {
  args: {
    onEventListeners: {},
  },
  render: (args: any) => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ flex: 1, width: '100%', height: '100%' }}>
        <ReactNativeSkiaGameEngine {...args}>
          <Gestures />
        </ReactNativeSkiaGameEngine>
      </View>
    </View>
  ),
};

const CameraControlView = () => {
  const { camera } = useSceneCamera();
  const { registerAnimation, removeAnimation } = useAnimationsController();
  const registeredAnimation = useSharedValue<ActiveAnimation | null>(null);

  const { entity: shipEntity } = useEntityInstance<Ship>({
    label: ENTITIES_KEYS.SHIP,
  });

  const shipAngle = useEntityValue<Ship, number>(
    shipEntity?.current?.id as string,
    'body',
    { processor: (value) => value?.angle ?? 0 }
  );

  useFrameEffect(
    () => {
      if (!camera || !shipAngle) return;
      if (registeredAnimation.value) removeAnimation(registeredAnimation.value);
      registeredAnimation.value = registerAnimation(
        camera.rotate,
        createTimingAnimation(
          camera.rotate.value,
          -(shipAngle.value || 0) / 2,
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

const GameWithCameraControlScene = () => {
  const dimensions = useCanvasDimensions();
  if (!dimensions?.width || !dimensions?.height) return null;
  return (
    <Scene
      defaultSceneName={'gameScene'}
      isActive={true}
      x={0}
      y={0}
      width={dimensions.width}
      height={dimensions.height}
      exit={createFadeTransition()}
      transitionConfig={{ duration: 1000 }}
      defaultCameraProps={{
        scaleX: 1.2,
        scaleY: 1.2,
      }}
    >
      <SkyBackground />
      <StarsView />
      <SeaGroup />
      <Physics />
      <Collisions />
      <Swipe />
      <CameraControlView />
    </Scene>
  );
};

// export const CameraControl: Story = {
//   args: {
//     onEventListeners: {},
//   },
//   render: (args: any) => (
//     <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
//       <View style={{ flex: 1, width: '100%', height: '100%' }}>
//         <ReactNativeSkiaGameEngine {...args}>
//           <StateEntity isRunning={true} />
//           <GameWithCameraControlScene />
//         </ReactNativeSkiaGameEngine>
//       </View>
//     </View>
//   ),
// };
