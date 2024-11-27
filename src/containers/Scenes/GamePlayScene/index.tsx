import { ENTITIES_KEYS } from '@/constants/configs';
import {
  useCanvasDimensions,
  useEntityMemoizedValue,
} from '@/containers/ReactNativeSkiaGameEngine';
import { Scene } from '@/containers/ReactNativeSkiaGameEngine/components/Scene/Scene';
import { State } from '@/Game/Entities/State/State';
import { FC, PropsWithChildren } from 'react';

export const GamePlayScene: FC<PropsWithChildren> = ({ children }) => {
  const { width, height } = useCanvasDimensions();
  const isGamePlayExited = useEntityMemoizedValue<State, boolean>(
    { label: ENTITIES_KEYS.STATE },
    'isGamePlayExited'
  ) as boolean;
  return (
    <Scene
      defaultSceneName="gamePlayScene"
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
      {children}
    </Scene>
  );
};
