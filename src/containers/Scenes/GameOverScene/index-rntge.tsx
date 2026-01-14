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
      <Preload>
        <Asset
          id="Montserrat"
          type="font"
          family="Montserrat"
          resource={require('../../../../assets/fonts/Montserrat-SemiBold.ttf')}
        />
      </Preload>
      <Content>
        <GameOverTitle />
        <RestartGameButton />
      </Content>
    </Scene>
  );
};
