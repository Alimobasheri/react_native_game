import { FC } from 'react';
import { MainScene } from '../src/containers/Scenes/MainScene';
import { ReactNativeSkiaGameEngine } from '../src/containers/ReactNativeSkiaGameEngine';

export const Game: FC<unknown> = () => {
  return (
    <ReactNativeSkiaGameEngine onEventListeners={{}}>
      <MainScene />
    </ReactNativeSkiaGameEngine>
  );
};

export default Game;
