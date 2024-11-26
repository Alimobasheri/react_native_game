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
import { GAME_OVER_EVENT } from '@/constants/events';

export const MainScene: FC<PropsWithChildren> = ({ children }) => {
  const { width, height } = useCanvasDimensions();
  const stateEntityInstance = useAddEntity(new State(InitialGameState), {
    label: ENTITIES_KEYS.STATE,
  });

  useEventListener(GAME_OVER_EVENT.type, () => {
    stateEntityInstance.data.isGameOver = true;
    stateEntityInstance.data.isRunning = false;
  });
  return (
    <Scene
      defaultSceneName={Scenes.Main}
      width={width || 0}
      height={height || 0}
      isActive={true}
    >
      {children}
    </Scene>
  );
};
