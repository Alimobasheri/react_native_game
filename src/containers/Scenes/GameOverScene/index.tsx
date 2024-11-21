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

export const GameOverScene = () => {
  const { width, height } = useCanvasDimensions();
  const isGameOver = useEntityMemoizedValue<State, boolean>(
    { label: ENTITIES_KEYS.STATE },
    'isGameOver'
  ) as boolean;
  return (
    <Scene
      defaultSceneName={Scenes.GameOver}
      width={width || 0}
      height={height || 0}
      isActive={isGameOver}
      transitionConfig={{ duration: 500 }}
    >
      <GameOverTitle x={(width || 0) / 2} y={(height || 0) / 10} />
      <RestartGameButton x={(width || 0) / 2} y={((height || 0) / 10) * 9} />
    </Scene>
  );
};
