import { ENTITIES_KEYS } from '@/constants/configs';
import {
  useCanvasDimensions,
  useEntityInstance,
  useEntityMemoizedValue,
} from '@/containers/ReactNativeSkiaGameEngine';
import { Scene } from '@/containers/ReactNativeSkiaGameEngine/components/Scene/Scene';
import { IGameState, State } from '@/Game/Entities/State/State';
import { FC, PropsWithChildren, useEffect, useState } from 'react';
import { SeaGroup } from '@/components/SeaGroupRenderer/SeaGroup-rnsge';
import { SkyBackground } from '@/components/SkyBackground';
import { StarsView } from '@/components/StarsView/StarsView-rnsge';
import { Physics } from '@/components/Physics';
import { Collisions } from '@/components/Collisions';
import { Swipe } from '@/components/Swipe';
import { ActionCameraControl } from '@/components/ActionCameraControl';
import { Scenes } from '@/constants/scenes';
import { GameStateControl } from '@/components/GameStateControl';
import {
  runOnJS,
  SharedValue,
  useAnimatedReaction,
} from 'react-native-reanimated';

export const GamePlayScene: FC<PropsWithChildren> = ({ children }) => {
  const { width, height } = useCanvasDimensions();
  const [isActive, setIsActive] = useState(true);
  const isGamePlayExited = useEntityMemoizedValue<State, SharedValue<boolean>>(
    { label: ENTITIES_KEYS.STATE },
    '_isGamePlayExited'
  ) as SharedValue<boolean>;
  useAnimatedReaction(
    () => isGamePlayExited.value,
    (isExited) => {
      runOnJS(setIsActive)(!isExited);
    },
    [isGamePlayExited]
  );
  return (
    <Scene
      defaultSceneName={Scenes.GamePlay}
      width={width || 0}
      height={height || 0}
      defaultCameraProps={{
        scaleX: 1.5,
        scaleY: 1.5,
        translateY: (height || 0) / 7,
      }}
      isActive={isActive}
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
