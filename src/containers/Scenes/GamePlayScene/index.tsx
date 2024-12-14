import { ENTITIES_KEYS } from '@/constants/configs';
import {
  useCanvasDimensions,
  useEntityInstance,
  useEntityMemoizedValue,
} from '@/containers/ReactNativeSkiaGameEngine';
import { Scene } from '@/containers/ReactNativeSkiaGameEngine/components/Scene/Scene';
import { IGameState, State } from '@/Game/Entities/State/State';
import { FC, PropsWithChildren, useEffect } from 'react';
import { SeaGroup } from '@/components/SeaGroupRenderer/SeaGroup-rnsge';
import { SkyBackground } from '@/components/SkyBackground';
import { StarsView } from '@/components/StarsView/StarsView-rnsge';
import { Physics } from '@/components/Physics';
import { Collisions } from '@/components/Collisions';
import { Swipe } from '@/components/Swipe';
import { ActionCameraControl } from '@/components/ActionCameraControl';
import { Scenes } from '@/constants/scenes';
import { GameStateControl } from '@/components/GameStateControl';

export const GamePlayScene: FC<PropsWithChildren> = ({ children }) => {
  const { width, height } = useCanvasDimensions();
  const isGamePlayExited = useEntityMemoizedValue<State, boolean>(
    { label: ENTITIES_KEYS.STATE },
    'isGamePlayExited'
  ) as boolean;
  const state = useEntityMemoizedValue<State, IGameState>(
    { label: ENTITIES_KEYS.STATE },
    'state'
  ) as IGameState;

  const { entity: stateEntityInstance } = useEntityInstance<State>({
    label: ENTITIES_KEYS.STATE,
  });
  return (
    <Scene
      defaultSceneName={Scenes.GamePlay}
      width={width || 0}
      height={height || 0}
      defaultCameraProps={{
        scaleX: 2,
        scaleY: 2,
        translateY: (height || 0) / 7,
      }}
      isActive={!isGamePlayExited}
      transitionConfig={{ duration: 500 }}
    >
      <SkyBackground />
      <StarsView />
      <SeaGroup />
      <Physics />
      <Collisions />
      <Swipe />
      <ActionCameraControl />
      <GameStateControl />
    </Scene>
  );
};
