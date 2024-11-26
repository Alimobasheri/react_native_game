import { Scenes } from '@/constants/scenes';
import {
  useCanvasDimensions,
  useEntityMemoizedValue,
} from '@/containers/ReactNativeSkiaGameEngine';
import { Scene } from '@/containers/ReactNativeSkiaGameEngine/components/Scene/Scene';
import { Group, useFont } from '@shopify/react-native-skia';
import { FC, PropsWithChildren } from 'react';
import { SwipeToPlay } from './components/SwipeToPlay';
import { Title } from './components/Title';
import { StartSwipe } from './components/StartSwipe';
import { State } from '@/Game/Entities/State/State';
import { ENTITIES_KEYS } from '@/constants/configs';
import { createFadeTransition } from '@/containers/ReactNativeSkiaGameEngine/utils/transitions/createFadeTransition';

export const StartingScene: FC<PropsWithChildren> = ({ children }) => {
  const dimensions = useCanvasDimensions();
  const font = useFont(
    require('../../../../assets/fonts/Montserrat-SemiBold.ttf'),
    16
  );
  const text = 'SWIPE UP TO START';
  const isRunning = useEntityMemoizedValue<State, boolean>(
    { label: ENTITIES_KEYS.STATE },
    'isRunning'
  ) as boolean;
  const isGameOver = useEntityMemoizedValue<State, boolean>(
    { label: ENTITIES_KEYS.STATE },
    'isGameOver'
  ) as boolean;
  if (!dimensions?.width || !dimensions?.height) return null;
  const titleWidth = Math.min(dimensions.width * 0.2, 100);
  return (
    <Scene
      defaultSceneName={Scenes.Start}
      isActive={!isRunning && !isGameOver}
      x={0}
      y={0}
      width={dimensions.width}
      height={dimensions.height}
      exit={createFadeTransition()}
      transitionConfig={{ duration: 500 }}
    >
      {font && (
        <SwipeToPlay
          text={text}
          x={dimensions.width / 2}
          y={dimensions.height - 20}
          width={dimensions.width}
          height={dimensions.height}
          font={font}
        />
      )}
      {children}
      <Title
        x={dimensions.width / 2 - titleWidth / 2}
        y={20}
        width={titleWidth}
        height={titleWidth * 0.5}
      />
      <Group
        origin={{ x: dimensions.width / 2, y: dimensions.height - 20 }}
        transform={[{ translateX: -(text.length * 10) / 2 }]}
      >
        <StartSwipe />
      </Group>
    </Scene>
  );
};
