import {
  Asset,
  Content,
  Preload,
  Scene,
} from '@/containers/ReactNativeSkiaGameEngine';
import { GameOverTitle } from './GameOverTitle/GameOverTitle-rntge';
import { RestartGameButton } from './RestartGameButton/RestartGameButton-rntge';

export const GameOverScene = () => {
  return (
    <Scene name="gameOver" isActive={false}>
      <Content>
        <GameOverTitle />
        <RestartGameButton />
      </Content>
    </Scene>
  );
};
