import {
  Asset,
  Content,
  Preload,
  Scene,
} from '@/containers/ReactNativeSkiaGameEngine';
import {
  useAddEntity,
  useCanvasDimensions,
} from '@/containers/ReactNativeSkiaGameEngine/hooks-ecs';
import {
  createRenderComponent,
  ShapeTypes,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { FC, useMemo } from 'react';
import { GameOverTitle } from './GameOverTitle/GameOverTitle-rntge';
import { GameOverScore } from './GameOverScore/GameOverScore-rntge';
import { RestartGameButton } from './RestartGameButton/RestartGameButton-rntge';

type GameOverSceneProps = {
  backgroundColor?: string;
};

const GameOverBackground: FC<{ color: string }> = ({ color }) => {
  const dimensions = useCanvasDimensions();

  const components = useMemo(() => {
    return [
      createRenderComponent({
        shape: {
          type: ShapeTypes.Rectangle,
          width: dimensions.width,
          height: dimensions.height,
        },
        // Rectangles are centered on `position` in RNTGE.
        position: { x: dimensions.width / 2, y: dimensions.height / 2 },
        fillColor: color,
        visible: true,
        zIndex: -100,
      }),
    ];
  }, [color, dimensions.height, dimensions.width]);

  useAddEntity({ components });

  return null;
};

export const GameOverScene: FC<GameOverSceneProps> = ({ backgroundColor }) => {
  return (
    <Scene name="gameOver" isActive={false}>
      <Content>
        {backgroundColor ? <GameOverBackground color={backgroundColor} /> : null}
        <GameOverTitle />
        <GameOverScore />
        <RestartGameButton />
      </Content>
    </Scene>
  );
};
