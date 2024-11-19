import { ENTITIES_KEYS } from '@/constants/configs';
import { Scenes } from '@/constants/scenes';
import {
  useAddEntity,
  useCanvasDimensions,
} from '@/containers/ReactNativeSkiaGameEngine';
import { Scene } from '@/containers/ReactNativeSkiaGameEngine/components/Scene/Scene';
import { State } from '@/Game/Entities/State/State';
import { FC, PropsWithChildren } from 'react';

export const MainScene: FC<PropsWithChildren> = ({ children }) => {
  const { width, height } = useCanvasDimensions();
  useAddEntity(new State(false), { label: ENTITIES_KEYS.STATE });
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
