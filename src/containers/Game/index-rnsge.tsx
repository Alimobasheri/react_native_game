import { FC } from 'react';
import { MainScene } from '../Scenes/MainScene';
import { GamePlayScene } from '../Scenes/GamePlayScene';
import { StartingScene } from '../Scenes/StartingScene';
import { ReactNativeSkiaGameEngine } from '../ReactNativeSkiaGameEngine';
import { SeaGroup } from '@/components/SeaGroupRenderer/SeaGroup-rnsge';
import { SkyBackground } from '@/components/SkyBackground';
import { StarsView } from '@/components/StarsView/StarsView-rnsge';
import { Physics } from '@/components/Physics';
import { Collisions } from '@/components/Collisions';
import { Swipe } from '@/components/Swipe';
import { ActionCameraControl } from '@/components/ActionCameraControl';
import { GameOverScene } from '../Scenes/GameOverScene';

export const Game: FC<unknown> = () => {
  return (
    <ReactNativeSkiaGameEngine onEventListeners={{}}>
      <MainScene />
    </ReactNativeSkiaGameEngine>
  );
};
