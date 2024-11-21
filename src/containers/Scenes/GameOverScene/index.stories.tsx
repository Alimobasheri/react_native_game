import {
  Entity,
  ReactNativeSkiaGameEngine,
  useAddEntity,
  useTouchHandler,
} from '@/containers/ReactNativeSkiaGameEngine';
import { GameOverScene } from '.';
import type { Meta, StoryObj } from '@storybook/react';
import { Rect } from '@shopify/react-native-skia';
import { Dimensions, View } from 'react-native';
import { FC, useEffect, useState } from 'react';
import { State } from '@/Game/Entities/State/State';
import { ENTITIES_KEYS } from '@/constants/configs';
import { InitialGameState } from '@/constants/gameState';
import { runOnJS, useSharedValue } from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';
const { width: windowWidth, height: windowHeight } = Dimensions.get('window');
const width = windowWidth;
const height = windowHeight;

const meta = {
  title: 'Scenes/Game Over Scene',
  component: GameOverScene,
  args: {},
} satisfies Meta<typeof GameOverScene>;

export default meta;

type Story = StoryObj<typeof meta>;

const GameStateEntity: FC<{ isGameOver: boolean }> = ({ isGameOver }) => {
  const stateEntity = useAddEntity(
    new State({ ...InitialGameState, isGameOver }),
    {
      label: ENTITIES_KEYS.STATE,
    }
  );
  useEffect(() => {
    if (stateEntity.data.isGameOver === isGameOver) return;
    stateEntity.data.isGameOver = isGameOver;
  }, [isGameOver]);
  return null;
};

const ControlScene = ({
  isGameOver,
  setIsGameOver,
}: {
  isGameOver: boolean;
  setIsGameOver: any;
}) => {
  const { addGesture, removeGesture } = useTouchHandler();
  const gestureId = useSharedValue<null | string>(null);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const touchWidth = useSharedValue(100);
  const touchHeight = useSharedValue(100);
  useEffect(() => {
    gestureId.value = addGesture({
      gesture: Gesture.Tap().onEnd(() => {
        runOnJS(setIsGameOver)(!isGameOver);
      }),
      rect: {
        x,
        y,
        width: touchWidth,
        height: touchHeight,
      },
    });
    return () => {
      if (gestureId.value) removeGesture(gestureId.value);
    };
  }, [isGameOver]);
  return null;
};

export const Primary: Story = {
  args: {},

  render: (args: any) => {
    const [isGameOver, setIsGameOver] = useState(true);

    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ width, height }}>
          <ReactNativeSkiaGameEngine onEventListeners={{}}>
            <ControlScene
              isGameOver={isGameOver}
              setIsGameOver={setIsGameOver}
            />
            <Rect x={0} y={0} width={width} height={height} color="blue" />
            <GameStateEntity isGameOver={isGameOver} />
            <GameOverScene />
          </ReactNativeSkiaGameEngine>
        </View>
      </View>
    );
  },
};
