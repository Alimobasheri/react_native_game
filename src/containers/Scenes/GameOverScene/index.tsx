import { Scenes } from '@/constants/scenes';
import {
  useCanvasDimensions,
  useEntityMemoizedValue,
} from '@/containers/ReactNativeSkiaGameEngine';
import { Scene } from '@/containers/ReactNativeSkiaGameEngine/components/Scene/Scene';
import { GameOverTitle } from './GameOverTitle/GameOverTitle';
import { State } from '@/Game/Entities/State/State';
import { ENTITIES_KEYS } from '@/constants/configs';
import { RestartGameButton } from './RestartGameButton/RestartGameButton';
import { GameOverBackground } from './GameOverBackground/GameOverBackground';
import { useState } from 'react';
import {
  runOnJS,
  SharedValue,
  useAnimatedReaction,
} from 'react-native-reanimated';

export const GameOverScene = () => {
  const { width, height } = useCanvasDimensions();
  const [isActive, setIsActive] = useState(false);
  const isGameOver = useEntityMemoizedValue<State, SharedValue<boolean>>(
    { label: ENTITIES_KEYS.STATE },
    '_isGameOver'
  ) as SharedValue<boolean>;

  useAnimatedReaction(
    () => isGameOver.value,
    (isGameOver) => {
      runOnJS(setIsActive)(isGameOver);
    },
    [isGameOver]
  );
  return (
    <Scene
      defaultSceneName={Scenes.GameOver}
      width={width || 0}
      height={height || 0}
      isActive={isActive}
      transitionConfig={{ duration: 500 }}
    >
      {/* <GameOverBackground /> */}
      <GameOverTitle x={(width || 0) / 2} y={(height || 0) / 10} />
      <RestartGameButton x={(width || 0) / 2} y={((height || 0) / 10) * 9} />
    </Scene>
  );
};
