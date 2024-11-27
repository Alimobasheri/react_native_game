import { ENTITIES_KEYS } from '@/constants/configs';
import { InitialGameState } from '@/constants/gameState';
import { Scenes } from '@/constants/scenes';
import {
  useAddEntity,
  useCanvasDimensions,
} from '@/containers/ReactNativeSkiaGameEngine';
import { Scene } from '@/containers/ReactNativeSkiaGameEngine/components/Scene/Scene';
import { useEventListener } from '@/containers/ReactNativeSkiaGameEngine/hooks/useEventListener';
import { State } from '@/Game/Entities/State/State';
import { FC, PropsWithChildren } from 'react';
import {
  BUOYANT_VEHICLE_SINKED_EVENT_TYPE,
  GAME_OVER_EVENT,
  RESTART_GAME_EVENT,
} from '@/constants/events';
import { VEHICLE_TYPE_IDENTIFIERS } from '@/constants/vehicle';
import { GameEvent } from '@/containers/ReactNativeSkiaGameEngine/types';
import { GamePlayScene } from '../../Scenes/GamePlayScene';
import { StartingScene } from '../../Scenes/StartingScene';
import { SeaGroup } from '@/components/SeaGroupRenderer/SeaGroup-rnsge';
import { SkyBackground } from '@/components/SkyBackground';
import { StarsView } from '@/components/StarsView/StarsView-rnsge';
import { Physics } from '@/components/Physics';
import { Collisions } from '@/components/Collisions';
import { Swipe } from '@/components/Swipe';
import { ActionCameraControl } from '@/components/ActionCameraControl';
import { GameOverScene } from '../../Scenes/GameOverScene';

export const MainScene: FC<PropsWithChildren> = ({ children }) => {
  const { width, height } = useCanvasDimensions();
  const stateEntityInstance = useAddEntity(new State(InitialGameState), {
    label: ENTITIES_KEYS.STATE,
  });

  useEventListener(GAME_OVER_EVENT.type, () => {
    stateEntityInstance.data.isGameOver = true;
    stateEntityInstance.data.isRunning = false;
  });
  useEventListener(BUOYANT_VEHICLE_SINKED_EVENT_TYPE, (data: GameEvent) => {
    if (data.data.type === VEHICLE_TYPE_IDENTIFIERS.SHIP) {
      stateEntityInstance.data.isGameOver = true;
      stateEntityInstance.data.isRunning = false;
    }
  });
  useEventListener(RESTART_GAME_EVENT.type, () => {
    stateEntityInstance.data.isGameOver = false;
    stateEntityInstance.data.isGamePlayExited = true;
    setTimeout(() => {
      stateEntityInstance.data.isGamePlayExited = false;
      stateEntityInstance.data.isRunning = true;
    }, 500);
  });
  return (
    <Scene
      defaultSceneName={Scenes.Main}
      width={width || 0}
      height={height || 0}
      isActive={true}
    >
      <GamePlayScene>
        <SkyBackground />
        <StarsView />
        <SeaGroup />
        <Physics />
        <Collisions />
        <Swipe />
        <ActionCameraControl />
      </GamePlayScene>
      <StartingScene />
      <GameOverScene />
    </Scene>
  );
};
